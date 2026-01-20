from typing import Dict, List, Optional, Set
from fastapi import WebSocket
import json
import asyncio


class NotificationService:
    """推送通知服务 - 管理 WebSocket 连接,推送生成结果"""
    
    # 类级别的连接池: {char_name: Set[WebSocket]}
    _connections: Dict[str, Set[WebSocket]] = {}
    _lock = asyncio.Lock()
    
    @classmethod
    async def register_connection(cls, char_name: str, websocket: WebSocket):
        """
        注册 WebSocket 连接
        
        Args:
            char_name: 角色名称
            websocket: WebSocket 连接对象
        """
        async with cls._lock:
            if char_name not in cls._connections:
                cls._connections[char_name] = set()
            cls._connections[char_name].add(websocket)
            print(f"[NotificationService] ✅ 连接已注册: {char_name}, 当前连接数={len(cls._connections[char_name])}")
    
    @classmethod
    async def unregister_connection(cls, char_name: str, websocket: WebSocket):
        """
        注销 WebSocket 连接
        
        Args:
            char_name: 角色名称
            websocket: WebSocket 连接对象
        """
        async with cls._lock:
            if char_name in cls._connections:
                cls._connections[char_name].discard(websocket)
                if not cls._connections[char_name]:
                    del cls._connections[char_name]
                print(f"[NotificationService] 连接已注销: {char_name}")
    
    @classmethod
    async def notify_phone_call_ready(cls, char_name: str, call_id: int, segments: List[Dict], audio_path: Optional[str]):
        """
        推送电话生成完成通知
        
        Args:
            char_name: 角色名称
            call_id: 电话记录ID
            segments: 情绪片段
            audio_path: 音频文件路径
        """
        message = {
            "type": "phone_call_ready",
            "char_name": char_name,
            "call_id": call_id,
            "segments": segments,
            "audio_path": audio_path,
            "timestamp": asyncio.get_event_loop().time()
        }
        
        await cls.broadcast_to_char(char_name, message)
    
    @classmethod
    async def broadcast_to_char(cls, char_name: str, message: Dict):
        """
        向指定角色的所有连接广播消息
        
        Args:
            char_name: 角色名称
            message: 消息内容
        """
        async with cls._lock:
            if char_name not in cls._connections or not cls._connections[char_name]:
                print(f"[NotificationService] ⚠️ 无活跃连接: {char_name}, 消息未推送")
                return
            
            # 复制连接集合,避免迭代时修改
            connections = cls._connections[char_name].copy()
        
        # 发送消息
        message_json = json.dumps(message, ensure_ascii=False)
        disconnected = []
        
        for ws in connections:
            try:
                await ws.send_text(message_json)
                print(f"[NotificationService] ✅ 消息已推送: {char_name}, type={message.get('type')}")
            except Exception as e:
                print(f"[NotificationService] ❌ 推送失败: {char_name}, 错误={str(e)}")
                disconnected.append(ws)
        
        # 清理断开的连接
        if disconnected:
            async with cls._lock:
                for ws in disconnected:
                    cls._connections[char_name].discard(ws)
    
    @classmethod
    def get_connection_count(cls, char_name: Optional[str] = None) -> int:
        """
        获取连接数量
        
        Args:
            char_name: 角色名称,为 None 时返回总连接数
            
        Returns:
            连接数量
        """
        if char_name:
            return len(cls._connections.get(char_name, set()))
        else:
            return sum(len(conns) for conns in cls._connections.values())
