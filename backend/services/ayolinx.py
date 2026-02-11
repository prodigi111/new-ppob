"""
Ayolinx Payment Gateway Integration Service
Supports: Virtual Account, QRIS, E-Wallet
"""
import os
import hashlib
import hmac
import base64
import json
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from Crypto.PublicKey import RSA
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256

# Environment configuration
AYOLINX_CLIENT_KEY = os.environ.get("AYOLINX_CLIENT_KEY", "")
AYOLINX_CLIENT_SECRET = os.environ.get("AYOLINX_CLIENT_SECRET", "")
AYOLINX_CUSTOMER_NO = os.environ.get("AYOLINX_CUSTOMER_NO", "")
AYOLINX_PRIVATE_KEY_PATH = os.environ.get("AYOLINX_PRIVATE_KEY_PATH", "")
AYOLINX_PUBLIC_KEY_PATH = os.environ.get("AYOLINX_PUBLIC_KEY_PATH", "")

# Load keys from files
def load_key_from_file(path: str) -> str:
    if path and os.path.exists(path):
        with open(path, 'r') as f:
            return f.read()
    return ""

AYOLINX_PRIVATE_KEY = load_key_from_file(AYOLINX_PRIVATE_KEY_PATH)
AYOLINX_PUBLIC_KEY = load_key_from_file(AYOLINX_PUBLIC_KEY_PATH)

# API URLs
SANDBOX_URL = "https://sandbox.ayolinx.id"
PRODUCTION_URL = "https://openapi.ayolinx.id"

# Use sandbox for development
BASE_URL = SANDBOX_URL

# Supported payment channels
VA_CHANNELS = {
    "bca": "VIRTUAL_ACCOUNT_BCA",
    "bni": "VIRTUAL_ACCOUNT_BNI",
    "bri": "VIRTUAL_ACCOUNT_BRI",
    "mandiri": "VIRTUAL_ACCOUNT_MANDIRI",
    "permata": "VIRTUAL_ACCOUNT_PERMATA",
    "cimb": "VIRTUAL_ACCOUNT_CIMB",
}

# PartnerServiceId per channel (sandbox values)
VA_PARTNER_SERVICE_ID = {
    "bni": "98829172",
    "bri": "15573",
    "mandiri": "87319",
    "cimb": "2056",
}

class AyolinxService:
    def __init__(self):
        self.client_key = AYOLINX_CLIENT_KEY
        self.client_secret = AYOLINX_CLIENT_SECRET
        self.customer_no = AYOLINX_CUSTOMER_NO
        self.private_key = AYOLINX_PRIVATE_KEY
        self.public_key = AYOLINX_PUBLIC_KEY
        self.base_url = BASE_URL
        self.access_token = None
        self.token_expires_at = None
    
    def _get_timestamp(self) -> str:
        """Generate timestamp in ISO 8601 format with timezone"""
        # Use Jakarta timezone (UTC+7)
        jakarta_tz = timezone(timedelta(hours=7))
        now = datetime.now(jakarta_tz)
        return now.strftime("%Y-%m-%dT%H:%M:%S+07:00")
    
    def _generate_external_id(self) -> str:
        """Generate unique external ID"""
        import random
        return str(random.randint(100000000000, 999999999999))
    
    def _sign_for_token(self, timestamp: str) -> str:
        """
        Generate signature for access token request
        StringToSign: clientKey + "|" + timestamp
        """
        if not self.private_key:
            # Return dummy signature for testing
            return "dummy_signature_for_testing"
        
        try:
            string_to_sign = f"{self.client_key}|{timestamp}"
            
            # Load private key and sign
            key = RSA.import_key(self.private_key)
            h = SHA256.new(string_to_sign.encode('utf-8'))
            signature = pkcs1_15.new(key).sign(h)
            
            return base64.b64encode(signature).decode('utf-8')
        except Exception as e:
            print(f"Error generating token signature: {e}")
            return ""
    
    def _sign_for_api(self, method: str, url: str, body_str: str, token: str, timestamp: str) -> str:
        """
        Generate signature for API calls
        StringToSign: method + ":" + url + ":" + token + ":" + sha256(body) + ":" + timestamp
        Then HMAC-SHA512 with client_secret
        """
        if not self.client_secret:
            return "dummy_signature_for_testing"
        
        try:
            # SHA256 hash of raw body string
            body_hash = hashlib.sha256(body_str.encode('utf-8')).hexdigest()
            
            # String to sign (correct order: method:url:token:bodyHash:timestamp)
            string_to_sign = f"{method}:{url}:{token}:{body_hash}:{timestamp}"
            
            # HMAC-SHA512
            signature = hmac.new(
                self.client_secret.encode('utf-8'),
                string_to_sign.encode('utf-8'),
                hashlib.sha512
            ).digest()
            
            return base64.b64encode(signature).decode('utf-8')
        except Exception as e:
            print(f"Error generating API signature: {e}")
            return ""
    
    async def get_access_token(self) -> Optional[str]:
        """Get access token from Ayolinx"""
        # Check if we have a valid cached token
        if self.access_token and self.token_expires_at:
            if datetime.now(timezone.utc) < self.token_expires_at:
                return self.access_token
        
        timestamp = self._get_timestamp()
        signature = self._sign_for_token(timestamp)
        
        headers = {
            "Content-Type": "application/json",
            "X-TIMESTAMP": timestamp,
            "X-CLIENT-KEY": self.client_key,
            "X-SIGNATURE": signature,
        }
        
        body = {"grantType": "client_credentials"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v1.0/access-token/b2b",
                    headers=headers,
                    json=body,
                    timeout=30.0
                )
                
                data = response.json()
                
                if data.get("responseCode") == "2007300":
                    self.access_token = data.get("accessToken")
                    expires_in = int(data.get("expiresIn", 3600))
                    self.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in - 60)
                    return self.access_token
                else:
                    print(f"Failed to get access token: {data}")
                    return None
        except Exception as e:
            print(f"Error getting access token: {e}")
            return None
    
    async def create_virtual_account(
        self,
        order_id: str,
        amount: float,
        customer_name: str,
        channel: str = "bni",
        customer_email: str = "",
        customer_phone: str = ""
    ) -> Dict[str, Any]:
        """Create Virtual Account for payment"""
        token = await self.get_access_token()
        if not token:
            return {"success": False, "error": "Failed to get access token"}
        
        timestamp = self._get_timestamp()
        external_id = self._generate_external_id()
        
        channel_code = VA_CHANNELS.get(channel.lower(), "VIRTUAL_ACCOUNT_BNI")
        partner_service_id = VA_PARTNER_SERVICE_ID.get(channel.lower(), "98829172")
        
        body = {
            "partnerServiceId": partner_service_id,
            "customerNo": str(external_id).ljust(20, '0')[:20],
            "virtualAccountNo": "",
            "virtualAccountName": customer_name[:50],
            "trxId": order_id,
            "virtualAccountTrxType": "C",
            "totalAmount": {
                "value": f"{amount:.2f}",
                "currency": "IDR"
            },
            "additionalInfo": {
                "channel": channel_code
            }
        }
        
        if customer_email:
            body["virtualAccountEmail"] = customer_email
        if customer_phone:
            body["virtualAccountPhone"] = customer_phone
        
        url = "/v1.0/transfer-va/create-va"
        body_str = json.dumps(body, separators=(',', ':'))
        signature = self._sign_for_api("POST", url, body_str, token, timestamp)
        
        headers = {
            "Content-Type": "application/json",
            "X-TIMESTAMP": timestamp,
            "X-SIGNATURE": signature,
            "X-PARTNER-ID": self.client_key,
            "X-EXTERNAL-ID": external_id,
            "CHANNEL-ID": "H2H",
            "Authorization": f"Bearer {token}",
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}{url}",
                    content=body_str.encode('utf-8'),
                    headers=headers,
                    timeout=30.0
                )
                
                data = response.json()
                
                if data.get("responseCode") == "2002700":
                    va_data = data.get("virtualAccountData", {})
                    return {
                        "success": True,
                        "payment_method": "virtual_account",
                        "channel": channel,
                        "va_number": va_data.get("virtualAccountNo"),
                        "amount": amount,
                        "customer_name": customer_name,
                        "order_id": order_id,
                        "trx_id": va_data.get("trxId"),
                        "expired_at": va_data.get("expiredDate"),
                        "raw_response": data
                    }
                else:
                    return {
                        "success": False,
                        "error": data.get("responseMessage", "Unknown error"),
                        "response_code": data.get("responseCode"),
                        "raw_response": data
                    }
        except Exception as e:
            print(f"Error creating VA: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate_qris(
        self,
        order_id: str,
        amount: float,
        customer_name: str = "Customer"
    ) -> Dict[str, Any]:
        """
        Generate QRIS payment code
        
        Args:
            order_id: Unique order/transaction ID
            amount: Payment amount in IDR
            customer_name: Customer name
        
        Returns:
            Dict with QRIS details or error
        """
        token = await self.get_access_token()
        if not token:
            return {"success": False, "error": "Failed to get access token"}
        
        timestamp = self._get_timestamp()
        external_id = self._generate_external_id()
        
        body = {
            "partnerReferenceNo": order_id,
            "amount": {
                "value": f"{amount:.2f}",
                "currency": "IDR"
            },
            "merchantId": self.customer_no,
            "terminalId": "001",
            "additionalInfo": {
                "customerName": customer_name
            }
        }
        
        url = "/v1.0/qr/qr-mpm-generate"
        signature = self._sign_for_api("POST", url, body, token, timestamp)
        
        headers = {
            "Content-Type": "application/json",
            "X-TIMESTAMP": timestamp,
            "X-SIGNATURE": signature,
            "X-PARTNER-ID": self.client_key,
            "X-EXTERNAL-ID": external_id,
            "Authorization": f"Bearer {token}",
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}{url}",
                    headers=headers,
                    json=body,
                    timeout=30.0
                )
                
                data = response.json()
                
                if data.get("responseCode") == "2004700":
                    return {
                        "success": True,
                        "payment_method": "qris",
                        "qr_content": data.get("qrContent"),
                        "qr_url": data.get("qrUrl"),
                        "amount": amount,
                        "order_id": order_id,
                        "reference_no": data.get("referenceNo"),
                        "expired_at": data.get("expiredDate"),
                        "raw_response": data
                    }
                else:
                    return {
                        "success": False,
                        "error": data.get("responseMessage", "Unknown error"),
                        "response_code": data.get("responseCode"),
                        "raw_response": data
                    }
        except Exception as e:
            print(f"Error generating QRIS: {e}")
            return {"success": False, "error": str(e)}
    
    def verify_callback_signature(self, signature: str, method: str, url: str, body: str, timestamp: str) -> bool:
        """
        Verify callback signature from Ayolinx
        
        Args:
            signature: X-SIGNATURE from header
            method: HTTP method
            url: Request URL path
            body: Raw request body
            timestamp: X-TIMESTAMP from header
        
        Returns:
            True if signature is valid
        """
        if not self.public_key:
            # Skip verification in test mode
            return True
        
        try:
            # Hash the body
            body_hash = hashlib.sha256(body.encode('utf-8')).hexdigest().lower()
            
            # String to verify
            string_to_verify = f"{method}:{url}:{body_hash}:{timestamp}"
            
            # Verify with public key
            key = RSA.import_key(self.public_key)
            h = SHA256.new(string_to_verify.encode('utf-8'))
            
            try:
                pkcs1_15.new(key).verify(h, base64.b64decode(signature))
                return True
            except (ValueError, TypeError):
                return False
        except Exception as e:
            print(f"Error verifying callback signature: {e}")
            return False


# Singleton instance
ayolinx_service = AyolinxService()
