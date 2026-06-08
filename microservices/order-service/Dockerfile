# syntax=docker/dockerfile:1

# ===== Stage 1: builder — instala dependências em um prefixo isolado =====
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Camada de dependências — cacheada até requirements.txt mudar (amigável a CI)
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

# ===== Stage 2: runtime — imagem mínima, sem root =====
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Usuário de sistema sem privilégios
RUN groupadd --system app && useradd --system --gid app --no-create-home app

WORKDIR /app

# Traz apenas os pacotes instalados (sem cache do pip, sem lixo de build)
COPY --from=builder /install /usr/local

# Código da aplicação, de posse do usuário não-root
COPY --chown=app:app app ./app

USER app

EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
