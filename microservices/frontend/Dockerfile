# syntax=docker/dockerfile:1

# ===== Base: instala dependências (camada cacheável) =====
FROM node:20-alpine AS base
WORKDIR /app
# Manifesto primeiro: a camada de deps só invalida quando package.json muda
COPY package.json ./
RUN npm install
COPY . .

# ===== Development: Vite dev server com HMR (alvo usado pelo docker-compose) =====
FROM base AS development
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ===== Build: compila os assets estáticos =====
FROM base AS build
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ===== Production: nginx unprivileged servindo estáticos (alvo para EKS) =====
FROM nginxinc/nginx-unprivileged:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
