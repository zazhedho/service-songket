FROM golang:1.25 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/service-songket .


FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 python3-venv python3-pip python3-certifi tzdata \
  && python3 -m venv /opt/songket-venv \
  && /opt/songket-venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/songket-venv/bin/pip install --no-cache-dir playwright certifi \
  && /opt/songket-venv/bin/python -m playwright install --with-deps chromium \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV SCRAPE_PANGAN_PYTHON=/opt/songket-venv/bin/python
ENV SCRAPE_BERITA_PYTHON=/opt/songket-venv/bin/python

COPY --from=builder /out/service-songket /app/service-songket
COPY --from=builder /app/python /app/python
COPY --from=builder /app/migrations /app/migrations
COPY --from=builder /app/docs /app/docs

EXPOSE 8080

CMD ["/app/service-songket"]
