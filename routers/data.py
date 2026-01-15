import os
import glob
from fastapi import APIRouter
from config import init_settings, load_json, save_json, get_current_dirs, MAPPINGS_FILE, SETTINGS_FILE
from utils import scan_audio_files
from schemas import BindRequest, UnbindRequest, CreateModelRequest, StyleRequest
import json
import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional, Dict

router = APIRouter()

# 2. 定义数据模型 (方便 FastAPI 解析)
class FavoriteItem(BaseModel):
    text: str
    audio_url: str # 前端传来的相对路径或URL
    char_name: str
    context: Optional[List[str]] = [] # 上下文列表
    tags: Optional[str] = ""

class DeleteFavRequest(BaseModel):
    id: str

# 定义收藏文件路径
FAVORITES_FILE = "data/favorites.json"
@router.get("/get_data")
def get_data():
    settings = init_settings()
    base_dir = settings["base_dir"]
    models_data = {}

    if os.path.exists(base_dir):
        for folder_name in os.listdir(base_dir):
            folder_path = os.path.join(base_dir, folder_name)
            if not os.path.isdir(folder_path): continue

            gpt = glob.glob(os.path.join(folder_path, "*.ckpt"))
            sovits = glob.glob(os.path.join(folder_path, "*.pth"))
            ref_dir = os.path.join(folder_path, "reference_audios")

            languages_map = {}

            if os.path.exists(ref_dir):
                # 1. 扫描根目录 (兼容旧模式)
                root_refs = scan_audio_files(ref_dir)
                if root_refs:
                    languages_map["default"] = root_refs

                # 2. 扫描子文件夹 (多语言支持)
                with os.scandir(ref_dir) as it:
                    for entry in it:
                        if entry.is_dir():
                            raw_folder_name = entry.name
                            target_lang_key = "Chinese" if raw_folder_name == "中文" else raw_folder_name

                            emotions_subdir = os.path.join(entry.path, "emotions")
                            found_refs = []

                            if os.path.exists(emotions_subdir):
                                found_refs = scan_audio_files(emotions_subdir)
                            else:
                                found_refs = scan_audio_files(entry.path)

                            if found_refs:
                                if target_lang_key not in languages_map:
                                    languages_map[target_lang_key] = []
                                languages_map[target_lang_key].extend(found_refs)

            models_data[folder_name] = {
                "gpt_path": gpt[0] if gpt else "",
                "sovits_path": sovits[0] if sovits else "",
                "languages": languages_map
            }

    mappings = load_json(MAPPINGS_FILE)
    return { "models": models_data, "mappings": mappings, "settings": settings }

@router.post("/bind_character")
def bind(req: BindRequest):
    m = load_json(MAPPINGS_FILE)
    m[req.char_name] = req.model_folder
    save_json(MAPPINGS_FILE, m)
    return {"status": "success"}

@router.post("/unbind_character")
def unbind(req: UnbindRequest):
    m = load_json(MAPPINGS_FILE)
    if req.char_name in m:
        del m[req.char_name]
        save_json(MAPPINGS_FILE, m)
    return {"status": "success"}

@router.post("/create_model_folder")
def create(req: CreateModelRequest):
    base_dir, _ = get_current_dirs()

    safe_name = "".join([c for c in req.folder_name if c.isalnum() or c in (' ','_','-')]).strip()
    if not safe_name: return {"status": "error", "msg": "Invalid name"}

    target_path = os.path.join(base_dir, safe_name)
    ref_root = os.path.join(target_path, "reference_audios")

    # 预创建常用语言包结构
    for lang in ["Chinese", "Japanese", "English"]:
        os.makedirs(os.path.join(ref_root, lang, "emotions"), exist_ok=True)

    os.makedirs(ref_root, exist_ok=True) # 确保根目录存在

    return {"status": "success"}
@router.post("/save_style")
def save_style(req: StyleRequest):
    # 1. 读取现有的系统设置
    settings = load_json(SETTINGS_FILE)

    # 2. 更新风格字段
    settings["bubble_style"] = req.style

    # 3. 写回 system_settings.json
    save_json(SETTINGS_FILE, settings)

    return {"status": "success", "current_style": req.style}

def _load_favs():
    if not os.path.exists(FAVORITES_FILE):
        return []
    return load_json(FAVORITES_FILE)

@router.get("/get_favorites")
def get_favorites():
    return {"favorites": _load_favs()}

@router.post("/add_favorite")
def add_favorite(item: FavoriteItem):
    favs = _load_favs()

    # 构造完整记录
    new_entry = item.dict()
    new_entry["id"] = str(uuid.uuid4()) # 生成唯一ID
    new_entry["created_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 插入到最前面
    favs.insert(0, new_entry)

    # 确保 data 目录存在并保存
    os.makedirs("data", exist_ok=True)
    save_json(FAVORITES_FILE, favs)

    return {"status": "success", "id": new_entry["id"]}

@router.post("/delete_favorite")
def delete_favorite(req: DeleteFavRequest):
    favs = _load_favs()
    # 过滤掉要删除的ID
    new_favs = [f for f in favs if f["id"] != req.id]

    save_json(FAVORITES_FILE, new_favs)
    return {"status": "success"}
