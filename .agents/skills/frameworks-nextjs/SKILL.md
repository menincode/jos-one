---
name: frameworks-nextjs
description: Next.js framework patterns including App Router, Server Components, and routing
---

# Next.js

## Description

Next.js framework with App Router, Server Components, and full-stack development patterns.

## When to Use

- React applications with SSR/SSG
- Full-stack applications
- App Router patterns

---

## Core Patterns

### App Router Structure

```
app/
â”œâ”€â”€ layout.tsx          # Root layout
â”œâ”€â”€ page.tsx            # Home page
â”œâ”€â”€ loading.tsx         # Loading UI
â”œâ”€â”€ error.tsx           # Error UI
â”œâ”€â”€ api/
â”‚   â””â”€â”€ users/
â”‚       â””â”€â”€ route.ts    # API route
â””â”€â”€ users/
    â”œâ”€â”€ page.tsx        # Users page
    â””â”€â”€ [id]/
        â””â”€â”€ page.tsx    # User detail
```

### Server Components

```tsx
// app/users/page.tsx - Server Component (default)
async function UsersPage() {
  const users = await db.users.findMany();

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Client Components

```tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

### API Routes

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const users = await db.users.findMany();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const user = await db.users.create({ data });
  return NextResponse.json(user, { status: 201 });
}
```

### Server Actions

```tsx
// app/actions.ts
'use server';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  await db.users.create({ data: { name } });
  revalidatePath('/users');
}
```

## Best Practices

1. Use Server Components by default
2. Add 'use client' only when needed
3. Colocate data fetching with components
4. Use loading.tsx for suspense boundaries
5. Implement proper error boundaries

## Common Pitfalls

- **Using hooks in Server Components**: Mark as 'use client'
- **Large client bundles**: Keep client components small
- **Missing loading states**: Add loading.tsx files