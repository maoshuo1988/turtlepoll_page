# Project Architecture

## Overview
This project now follows a feature-oriented structure:
- `app`: app shell and composition
- `features`: business modules (each block independent)
- `shared`: reusable infrastructure and cross-module utilities
- `data`: mock/static data source

## Current Structure

```text
src/
  app/
    AppShell.tsx

  features/
    layout/
      index.ts
      ui/Sidebar.tsx

    predictions/
      index.ts
      api/predictions.api.ts
      ui/HeroPrediction.tsx
      ui/NewsFeed.tsx
      ui/EventBattle.tsx

    forum/
      index.ts
      api/forum.api.ts
      ui/Forum.tsx
      ui/ForumCompose.tsx
      ui/ForumPost.tsx

    battle/
      index.ts
      api/battle.api.ts
      ui/BattleSquarePixel.tsx
      ui/BattleView.tsx

    pet/
      index.ts
      api/pet.api.ts
      ui/PetPage.tsx
      ui/PetChat.tsx
      ui/PetAssistant.tsx

    shop/
      index.ts
      api/shop.api.ts
      ui/Shop.tsx

    topic/
      index.ts
      ui/TopicDetail.tsx

    lab/
      index.ts
      ui/TurtleDivePixel.tsx
      ui/Lab.tsx

  shared/
    config/runtime.ts
    api/http-client.ts
    api/index.ts

  data/mock_data.ts
  App.tsx
  main.tsx
```

## API Layer (Single File)
- `shared/api.ts`
  - unified request entry
  - timeout control
  - query serialization
  - normalized HTTP error (`HttpError`)
  - all API interfaces centralized (DTO / Payload / Response)
  - unified API service registry (`apiServices`)

## Development Rules
1. Add new feature logic under `features/<feature>/...`.
2. Keep all API changes in `shared/api.ts`.
3. Put shared infra in `shared/` only.
4. `app/AppShell.tsx` is only for composition/layout, avoid business details.

## Next Step (optional)
- Split `AppShell` state/actions into feature hooks or stores:
  - `features/predictions/model`
  - `features/forum/model`
  - `features/battle/model`
  - `features/pet/model`
