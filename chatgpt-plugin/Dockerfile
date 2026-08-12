# DevPet ChatGPT Plugin — Docker 镜像
# 零依赖 Node 后端，可直接 `docker run` 部署到任意容器平台（云服务器 / K8s / Portainer 等）
FROM node:20-alpine

WORKDIR /app

# 复制项目（零依赖，无需 npm install）
COPY package.json server.js openapi.yaml manifest.json ./
COPY README.md install.md LICENSE ./

# 运行时数据卷（猫粮钱包 / token 用量持久化）
VOLUME ["/app/data"]

ENV NODE_ENV=production \
    PORT=8787 \
    STORE_FILE=/app/data/.devpet-store.json

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8787/health || exit 1

CMD ["node", "server.js"]
