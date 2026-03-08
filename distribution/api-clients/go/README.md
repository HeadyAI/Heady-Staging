<!-- HEADY_BRAND:BEGIN
<!-- ╔══════════════════════════════════════════════════════════════════╗
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<!-- ║                                                                  ║
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<!-- ║  FILE: distribution/api-clients/go/README.md                                                    ║
<!-- ║  LAYER: root                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# Heady Go SDK

Official Go client for the Heady API.

## Install

```bash
go get github.com/headysystems/heady-go
```

## Usage

```go
package main

import (
    "fmt"
    "os"
    heady "github.com/headysystems/heady-go"
)

func main() {
    client := heady.NewClient(heady.Config{
        APIKey:  os.Getenv("HEADY_API_KEY"),
        BaseURL: "http://manager.dev.local.heady.internal:3300",
    })

    resp, err := client.Chat("What's on my schedule today?")
    if err != nil {
        panic(err)
    }
    fmt.Println(resp.Message)
}
```

## Features

- Chat, agents, RAG, voice, automations
- Streaming responses via SSE
- Workspace management
- MCP tool invocation
- Local/hybrid/cloud endpoint support
