import { z } from 'zod';

/** Без генерації коду через new Function: на сторінці не виконується динамічний код. */
z.config({ jitless: true });
