FROM golang:1.25-alpine AS builder

WORKDIR /app

RUN apk add --no-cache gcc musl-dev sqlite-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server

FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache sqlite-libs ca-certificates

COPY --from=builder /app/server .

EXPOSE 8080

ENV PORT=8080
ENV JWT_SECRET="change-in-production"
ENV FRONTEND_URL="http://localhost:5173"

CMD ["./server"]