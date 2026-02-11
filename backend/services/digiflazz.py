"""
DigiFlazz Biller Integration Service
Supports: Pulsa, Paket Data, Game Vouchers, PLN, etc.
"""
import os
import hashlib
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime

# Environment configuration
DIGIFLAZZ_USERNAME = os.environ.get("DIGIFLAZZ_USERNAME", "")
DIGIFLAZZ_DEV_KEY = os.environ.get("DIGIFLAZZ_DEV_KEY", "")
DIGIFLAZZ_PROD_KEY = os.environ.get("DIGIFLAZZ_PROD_KEY", "")
DIGIFLAZZ_MODE = os.environ.get("DIGIFLAZZ_MODE", "development")  # development or production

# API URL
API_URL = "https://api.digiflazz.com/v1"


class DigiFlazzService:
    def __init__(self):
        self.username = DIGIFLAZZ_USERNAME
        self.dev_key = DIGIFLAZZ_DEV_KEY
        self.prod_key = DIGIFLAZZ_PROD_KEY
        self.mode = DIGIFLAZZ_MODE
        self.api_url = API_URL
    
    @property
    def api_key(self) -> str:
        """Get API key based on current mode"""
        return self.prod_key if self.mode == "production" else self.dev_key
    
    def _generate_signature(self, ref_id: str) -> str:
        """
        Generate MD5 signature for API requests
        Formula: md5(username + apiKey + ref_id)
        """
        string_to_sign = f"{self.username}{self.api_key}{ref_id}"
        return hashlib.md5(string_to_sign.encode()).hexdigest()
    
    def _generate_deposit_signature(self) -> str:
        """
        Generate MD5 signature for deposit check
        Formula: md5(username + apiKey + 'depo')
        """
        string_to_sign = f"{self.username}{self.api_key}depo"
        return hashlib.md5(string_to_sign.encode()).hexdigest()
    
    def _generate_pricelist_signature(self) -> str:
        """
        Generate MD5 signature for price list
        Formula: md5(username + apiKey + 'pricelist')
        """
        string_to_sign = f"{self.username}{self.api_key}pricelist"
        return hashlib.md5(string_to_sign.encode()).hexdigest()
    
    async def check_balance(self) -> Dict[str, Any]:
        """
        Check deposit/balance in DigiFlazz account
        """
        signature = self._generate_deposit_signature()
        
        payload = {
            "cmd": "deposit",
            "username": self.username,
            "sign": signature
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/cek-saldo",
                    json=payload,
                    timeout=30.0
                )
                
                data = response.json()
                
                if "data" in data:
                    return {
                        "success": True,
                        "balance": data["data"].get("deposit", 0),
                        "raw_response": data
                    }
                else:
                    return {
                        "success": False,
                        "error": data.get("message", "Unknown error"),
                        "raw_response": data
                    }
        except Exception as e:
            print(f"Error checking balance: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_price_list(self, category: Optional[str] = None) -> Dict[str, Any]:
        """
        Get product price list from DigiFlazz
        
        Args:
            category: Filter by category (e.g., 'Pulsa', 'Games', 'Data', 'E-Money')
        """
        signature = self._generate_pricelist_signature()
        
        payload = {
            "cmd": "prepaid",
            "username": self.username,
            "sign": signature
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/price-list",
                    json=payload,
                    timeout=60.0
                )
                
                data = response.json()
                
                # Check if data is a list (success) or dict (error/rate limit)
                if "data" in data:
                    products_data = data["data"]
                    
                    # Handle error responses (dict with rc/message)
                    if isinstance(products_data, dict):
                        if products_data.get("rc") or products_data.get("message"):
                            return {
                                "success": False,
                                "error": products_data.get("message", "Unknown error"),
                                "raw_response": data
                            }
                    
                    # Handle successful response (list of products)
                    if isinstance(products_data, list):
                        products = products_data
                        
                        # Filter by category if specified
                        if category:
                            products = [p for p in products if isinstance(p, dict) and category.lower() in p.get("category", "").lower()]
                        
                        return {
                            "success": True,
                            "total": len(products),
                            "products": products,
                        }
                    
                return {
                    "success": False,
                    "error": "Unexpected response format",
                    "raw_response": data
                }
        except Exception as e:
            print(f"Error getting price list: {e}")
            return {"success": False, "error": str(e)}
    
    async def topup(
        self,
        ref_id: str,
        buyer_sku_code: str,
        customer_no: str,
        testing: bool = False,
        max_price: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Process top-up transaction
        
        Args:
            ref_id: Unique reference ID for this transaction
            buyer_sku_code: Product SKU code from DigiFlazz
            customer_no: Customer number/ID (phone number, game ID, etc.)
            testing: Set True for testing mode (no real transaction)
            max_price: Maximum price limit (optional)
        
        Returns:
            Transaction result
        """
        signature = self._generate_signature(ref_id)
        
        payload = {
            "username": self.username,
            "buyer_sku_code": buyer_sku_code,
            "customer_no": customer_no,
            "ref_id": ref_id,
            "sign": signature
        }
        
        # Add testing flag if in development mode or explicitly requested
        if testing or self.mode == "development":
            payload["testing"] = True
        
        if max_price:
            payload["max_price"] = max_price
        
        print(f"[DigiFlazz] Topup request: {payload}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/transaction",
                    json=payload,
                    timeout=60.0
                )
                
                data = response.json()
                print(f"[DigiFlazz] Topup response: {data}")
                
                if "data" in data:
                    trx_data = data["data"]
                    
                    # Handle error response (dict with rc/message)
                    if isinstance(trx_data, dict) and "rc" in trx_data:
                        return {
                            "success": False,
                            "pending": False,
                            "failed": True,
                            "error": trx_data.get("message", "Transaction failed"),
                            "rc": trx_data.get("rc"),
                            "raw_response": data
                        }
                    
                    status = trx_data.get("status", "").lower() if isinstance(trx_data, dict) else ""
                    
                    return {
                        "success": status == "sukses",
                        "pending": status == "pending",
                        "failed": status == "gagal",
                        "ref_id": trx_data.get("ref_id") if isinstance(trx_data, dict) else ref_id,
                        "customer_no": trx_data.get("customer_no") if isinstance(trx_data, dict) else customer_no,
                        "buyer_sku_code": trx_data.get("buyer_sku_code") if isinstance(trx_data, dict) else buyer_sku_code,
                        "message": trx_data.get("message", "") if isinstance(trx_data, dict) else "",
                        "status": status,
                        "sn": trx_data.get("sn", "") if isinstance(trx_data, dict) else "",
                        "price": trx_data.get("price", 0) if isinstance(trx_data, dict) else 0,
                        "buyer_last_saldo": trx_data.get("buyer_last_saldo", 0) if isinstance(trx_data, dict) else 0,
                        "raw_response": data
                    }
                else:
                    return {
                        "success": False,
                        "pending": False,
                        "failed": True,
                        "error": data.get("message", "Unknown error"),
                        "raw_response": data
                    }
        except Exception as e:
            print(f"Error processing topup: {e}")
            return {
                "success": False,
                "pending": False,
                "failed": True,
                "error": str(e)
            }
    
    async def check_transaction_status(self, ref_id: str, buyer_sku_code: str, customer_no: str) -> Dict[str, Any]:
        """
        Check transaction status by re-submitting with same ref_id
        DigiFlazz uses idempotent transactions - same ref_id returns existing transaction status
        """
        return await self.topup(
            ref_id=ref_id,
            buyer_sku_code=buyer_sku_code,
            customer_no=customer_no,
            testing=False  # Don't add testing flag for status check
        )
    
    async def get_game_products(self) -> Dict[str, Any]:
        """
        Get game voucher products only
        """
        result = await self.get_price_list()
        
        if result.get("success"):
            # Filter for game-related products
            game_keywords = ["game", "mobile legend", "free fire", "pubg", "valorant", 
                          "genshin", "honkai", "call of duty", "garena", "diamond",
                          "uc", "cp", "genesis", "primogem"]
            
            products = result.get("products", [])
            game_products = []
            
            for p in products:
                if not isinstance(p, dict):
                    continue
                product_name = (p.get("product_name", "") + " " + p.get("brand", "")).lower()
                if any(keyword in product_name for keyword in game_keywords):
                    game_products.append(p)
            
            return {
                "success": True,
                "total": len(game_products),
                "products": game_products
            }
        
        return result


# Singleton instance
digiflazz_service = DigiFlazzService()
