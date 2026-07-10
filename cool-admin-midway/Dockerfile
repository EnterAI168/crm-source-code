
FROM node:lts-alpine

WORKDIR /app

# 配置alpine國內鏡像加速
RUN sed -i "s@http://dl-cdn.alpinelinux.org/@https://repo.huaweicloud.com/@g" /etc/apk/repositories

# 安裝tzdata,預設的alpine基礎鏡像不包含時區組件，安裝後可通過TZ環境變量配置時區
RUN apk add --no-cache tzdata

# 設置時區為中國東八區，這裡的配置可以被docker-compose.yml或docker run時指定的時區覆蓋
ENV TZ="Asia/Shanghai"

# 如果各公司有自己的私有源，可以替換registry地址,如使用官方源註釋下一行
RUN npm config set registry https://registry.npmmirror.com

# 複製package.json
COPY package.json ./package.json
# 安裝依賴
RUN npm install
# 構建項目
COPY . .
RUN npm run build
# 刪除開發期依賴
RUN rm -rf node_modules && rm package-lock.json    
# 安裝生產環境依賴
RUN npm install                        

# 如果端口更換，這邊可以更新一下
EXPOSE 8001

CMD ["npm", "run", "start"]
