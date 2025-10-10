# 使用 Node.js 18 LTS 版本
FROM node:18-alpine

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./

# 安装所有依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY tsconfig.json ./
COPY src ./src

# 编译 TypeScript
RUN pnpm build

# 删除开发依赖和源代码，减小镜像体积
RUN rm -rf src tsconfig.json node_modules && \
    pnpm install --frozen-lockfile --prod

# 创建配置文件目录
RUN mkdir -p /app/config

# 设置环境变量
ENV NODE_ENV=production
ENV CONFIG_PATH=/app/config/config.yaml

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# 运行应用
CMD ["node", "dist/index.js"]

