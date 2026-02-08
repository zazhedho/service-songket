FROM golang:1.25 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/service-songket .


FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 python3-pip tzdata \
  && python3 -m pip install --no-cache-dir certifi \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /out/service-songket /app/service-songket
COPY --from=builder /app/python /app/python
COPY --from=builder /app/migrations /app/migrations
COPY --from=builder /app/docs /app/docs

EXPOSE 8080

CMD ["/app/service-songket"]
