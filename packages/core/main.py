from fastapi import FastAPI

try:
    from core.middleware import SovereignAuthMiddleware
    from core.router import router
except ImportError:
    from middleware import SovereignAuthMiddleware
    from router import router

app = FastAPI(title="Heady Node", version="1.0.0")

app.add_middleware(SovereignAuthMiddleware)
app.include_router(router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "online", "sovereignty": "active"}

@app.get("/health/config")
def health_config():
    return {"status": "valid", "source": "manifest"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
