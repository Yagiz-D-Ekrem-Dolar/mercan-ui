# Mercan Arayüzü

[mckaywrigley/chatbot-ui](https://github.com/mckaywrigley/chatbot-ui) (MIT) temel alınarak Mercan modelleri için hazırlanmış Türkçe sohbet arayüzü.

## Özellikler

- **Modeller:** Mercan 0.8B ve Mercan 1.7B (sağ üstteki model düğmesinden tek tıkla seçilir)
- **Akıl yürütme:** açıkken `<model>-dusunen` kimliği istenir; düşünce süreci yanıtın üstünde açılır kutuda gösterilir
- **Web araması:** DuckDuckGo (anahtarsız; SearXNG veya Tavily de seçilebilir, sonuç yoksa Türkçe Vikipedi), kaynaklar yanıtın altında listelenir
- **Ayarlar (sol alt):** sistem istemi ve mercan-server'ın okuduğu hiperparametreler: `temperature`, `top_p`, `top_k`, `repeat_penalty`, `max_tokens`, `stop`, ayrıca bağlam uzunluğu; tema (açık/koyu) ve veri dışa aktarma
- Yanıtlarda daktilo efekti, yeniden oluşturma, düzenleyip yeniden gönderme, token/hız bilgisi
- Giriş/hesap yok: sohbetler tarayıcının yerel deposunda (localStorage) tutulur, Supabase gerekmez

## Çalıştırma

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev                   # http://localhost:3000
```

Model sunucusu (OpenAI uyumlu `/v1/chat/completions`):

```bash
mercan-server --model model.mercan --port 8765
```

## Yapılandırma (.env.local)

| Değişken | Açıklama |
|---|---|
| `MERCAN_API_BASE_URL` | Ortak sunucu adresi (varsayılan `http://127.0.0.1:8765/v1`) |
| `MERCAN_API_KEY` | Sunucu `--api-key` ile başlatıldıysa |
| `MERCAN_0_8B_BASE_URL`, `MERCAN_1_7B_BASE_URL` | Modeller ayrı sunucularda ise model bazında adres |
| `MERCAN_0_8B_MODEL`, `MERCAN_1_7B_MODEL` | Sunucudaki model kimliği (varsayılan `mercan-0.8b`, `mercan-1.7b`) |
| `MERCAN_REASONING_STYLE` | `model` (mercan-server, `-dusunen` kimliği) veya `template` (vLLM, `enable_thinking`) |
| `MERCAN_DEMO_MODE` | `false` (gerçek model), `auto` (sunucu hazır değilse örnek yanıt), `true` (hep örnek yanıt) |
| `WEB_SEARCH_PROVIDER` | `duckduckgo` (varsayılan), `searxng` (+`SEARXNG_URL`), `tavily` (+`TAVILY_API_KEY`) |

Sağ üstteki model adının yanındaki nokta sunucu durumunu gösterir: yeşil hazır, sarı yükleniyor, kırmızı model sunucuda yok, gri ulaşılamıyor, mavi demo.

## Lisans

MIT (orijinal chatbot-ui lisansı `license` dosyasındadır).
