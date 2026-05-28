"""Auth routes: login + me."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from db import db
from auth_utils import verify_password, create_token, require_admin

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
async def login(data: LoginRequest):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "role": user.get("role", "admin")},
    }


@router.get("/me")
async def me(auth: dict = Depends(require_admin)):
    return auth
