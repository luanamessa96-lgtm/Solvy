---
name: ui-solvy
description: Design system Solvy: colori, gradiente, temi, componenti, avatar, border-radius. Usa quando crei o modifichi componenti UI, stili, classi Tailwind, CSS variables.
user-invocable: false
---

# Design System Solvy

## Gradiente brand

Il gradiente Solvy è sempre `teal → fuchsia`, direzione `to-r`:
```
from-teal-400 to-fuchsia-500
```

Usato per: avatar border, pulsanti Pro, badge premium, accenti visivi.

## Temi (4 varianti)

Definiti in `src/styles/themes.css` come CSS variables. Non duplicare mai i valori inline.

| Tema | Classe body |
|------|-------------|
| free-light | `theme-free-light` |
| free-dark | `theme-free-dark` |
| pro-light | `theme-pro-light` |
| pro-dark | `theme-pro-dark` |

Pro themes: glassmorphism (`backdrop-blur`, `bg-white/10`, bordi semitrasparenti).

## Avatar

**Solo iniziali** con bordo gradiente teal→fuchsia. DiceBear è stato rimosso completamente — non reinstallarlo mai.

```tsx
// Pattern corretto
<div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-400 to-fuchsia-500 p-[2px]">
  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
    <span className="text-sm font-semibold">{initials}</span>
  </div>
</div>
```

## Header

Border-radius sugli angoli inferiori (`rounded-b-2xl` o equivalente CSS). Non rimuovere questo stile.

## Componenti Pro

Elementi visibili solo agli utenti Pro devono avere:
- Badge o indicatore visivo con il gradiente brand
- Lock icon per gli utenti Free che tentano l'accesso
- Non bloccare la visibilità, solo l'interazione (paywall modale)

## Bundle

Target: ≤250KB bundle size con lazy loading. Non importare librerie pesanti senza verificare l'impatto.
