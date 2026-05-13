# main.py
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import numpy as np
import matplotlib.pyplot as plt
from skimage import color, exposure, io
from skimage.graph import MCP_Geometric
import io as pyio
import json

app = FastAPI()

# 允许跨域请求 (CORS)，方便前端调用
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate")
async def generate_portrait(
    file: UploadFile = File(...),
    friction: float = Form(50.0),
    levels: int = Form(60),
    seeds_json: str = Form("[]"),  # 接收前端传来的 JSON 格式坐标
    export_format: str = Form("png")
):
    try:
        # 1. 读取上传的图像文件
        contents = await file.read()
        image = io.imread(pyio.BytesIO(contents))
        
        # 2. 转换为灰度图
        if len(image.shape) == 3:
            gray_img = color.rgb2gray(image)
        else:
            gray_img = image

        # 3. 创建阻力表面 (Cost Surface)
        # 将灰度归一化到 0-1
        # 3. Create Cost Surface
        gray_norm = exposure.rescale_intensity(gray_img, out_range=(0, 1))
        
        # When friction is 0: cost_surface = 1.0 (pure Euclidean)
        cost_surface = 1.0 + (1.0 - gray_norm) * friction
        
        # Absolute safeguard against 0 or negative resistance causing infinite loops
        cost_surface[cost_surface <= 0] = 0.001
        # 4. 解析种子点 (前端传来的是 [x, y]，Python 中数组是 [y, x])
        seeds_xy = json.loads(seeds_json)
        if not seeds_xy:
            # 如果没点，默认放在图像中间
            seeds_yx = [[gray_img.shape[0]//2, gray_img.shape[1]//2]]
        else:
            seeds_yx = [[int(pt[1]), int(pt[0])] for pt in seeds_xy]

        # 5. 运行 MCP 累积成本算法
        mcp = MCP_Geometric(cost_surface)
        cumulative_costs, _ = mcp.find_costs(seeds_yx)

# 6. 使用 Matplotlib 绘图
        fig, ax = plt.subplots(figsize=(12, 12), facecolor='white')
        ax.contour(cumulative_costs, levels=levels, colors='black', linewidths=0.8)
        ax.set_aspect('equal')
        ax.axis('off')
        plt.gca().invert_yaxis()

        buf = pyio.BytesIO()
        
        # 根据请求的格式进行保存
        if export_format.lower() == "svg":
            plt.savefig(buf, format="svg", bbox_inches='tight', pad_inches=0)
            media_type = "image/svg+xml"
        elif export_format.lower() == "jpeg":
            plt.savefig(buf, format="jpg", bbox_inches='tight', pad_inches=0, dpi=150)
            media_type = "image/jpeg"
        else:
            plt.savefig(buf, format="png", bbox_inches='tight', pad_inches=0, dpi=150)
            media_type = "image/png"

        plt.close(fig)
        buf.seek(0)
        return Response(content=buf.getvalue(), media_type=media_type)

    except Exception as e:
        return Response(content=f"Error: {str(e)}", status_code=500)