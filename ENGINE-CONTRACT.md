# SALVIAN AI VIDEO — Engine Contract

Status: engine-ready / provider pending.

## Production pipeline

The application owns the production workflow and persists the complete project contract before an external engine is connected:

Konsep → Script → Storyboard → Voice-over → Visual → Music → Subtitle → Timeline → Render Center → Hasil Video

## Production adapter

`lib/production-engine.ts` exposes `ProductionEngine.generate(request)` and accepts topic, duration, style, ratio, language, voice, music, autoStoryboard, autoSubtitle, and smartPacing.

The current implementation can return a deterministic preview package or an AI-generated package. A production provider can replace the adapter without changing the Studio UI contract.

## Render adapter

`lib/render-engine.ts` exposes `RenderEngineAdapter.submit(request)`.

The render result contract supports:
- queued
- running
- succeeded
- failed
- timeouted
- cancelled

The current adapter is intentionally pending and never fabricates a media URL.

## Render settings

Supported output values:
- Resolution: 720p, 1080p, 4K
- FPS: 24 FPS, 30 FPS, 60 FPS
- Quality: Standard, High, Maximum
- Format: MP4, WebM

## Central account and credits

SALVIAN AI VIDEO does not own an independent credit wallet. Account and credit operations route through SALVIAN AI CREATOR. The production/render engine must receive a server-authorized billing context when the real provider is connected; browser-only flags must never be treated as proof of payment.

## Provider boundary

The real Mureka/provider credentials must remain server-side. Connecting the provider is a separate final integration step and must not require rebuilding the Studio workflow.
