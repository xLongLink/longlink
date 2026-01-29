# from viavai import *
# from fastapi import (
#     FastAPI,
#     Depends,
#     HTTPException,
#     Query,
#     Path,
#     Body,
#     Header,
#     BackgroundTasks,
#     WebSocket,
#     WebSocketDisconnect,
#     status
# )
# from pydantic import BaseModel, Field
# from typing import List, Optional
# import time
# 
# # -------------------------------------------------------------------
# # App initialization
# # -------------------------------------------------------------------
# 
# app = FastAPI(
#     title="FastAPI Feature Demo",
#     description="Single-file example of common FastAPI features",
#     version="1.0.0"
# )
# 
# # -------------------------------------------------------------------
# # Middleware
# # -------------------------------------------------------------------
# 
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
# 
# # -------------------------------------------------------------------
# # Security (OAuth2 Bearer token)
# # -------------------------------------------------------------------
# 
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
# 
# def get_current_user(token: str = Depends(oauth2_scheme)):
#     if token != "secrettoken":
#         raise HTTPException(status_code=401, detail="Invalid token")
#     return {"username": "admin"}
# 
# # -------------------------------------------------------------------
# # Pydantic models
# # -------------------------------------------------------------------
# 
# class Item(BaseModel):
#     id: int
#     name: str = Field(..., min_length=2)
#     price: float = Field(..., gt=0)
#     tags: Optional[List[str]] = []
# 
# 
# class ItemCreate(BaseModel):
#     name: str
#     price: float
# 
# 
# class ErrorResponse(BaseModel):
#     detail: str
# 
# 
# # ------------------------------------------------------------------
# # Dependency injection
# # -------------------------------------------------------------------
# 
# def get_db():
#     # Fake DB session
#     return {"connected": True}
# 
# 
# 
# # -------------------------------------------------------------------
# # REST endpoints
# # -------------------------------------------------------------------
# 
# @app.get("/items/{item_id}", response_model=Item)
# def read_item(
#     item_id: int = Path(..., gt=0),
#     q: Optional[str] = Query(None, max_length=50),
#     user=Depends(get_current_user),
#     db=Depends(get_db),
# ):
#     if item_id == 999:
#         raise HTTPException(status_code=404, detail="Item not found")
# 
#     return Item(
#         id=item_id,
#         name=f"Item {item_id}",
#         price=10.5,
#         tags=[q] if q else []
#     )
# 
# @app.post(
#     "/items",
#     response_model=Item,
#     status_code=status.HTTP_201_CREATED,
#     responses={400: {"model": ErrorResponse}},
# )
# def create_item(
#     item: ItemCreate = Body(...),
#     background_tasks: BackgroundTasks = None,
#     user=Depends(get_current_user),
# ):
#     if item.price < 1:
#         raise ValueError("Price too low")
# 
#     background_tasks.add_task(write_log, f"Created item {item.name}")
# 
#     return Item(id=1, name=item.name, price=item.price, tags=[])
# 
# @app.get("/headers")
# def read_headers(user_agent: Optional[str] = Header(None)):
#     return {"user_agent": user_agent}
