# Login con código de 6 dígitos — config Supabase

Necesario para que el código aparezca en el email (Supabase no lo manda por
default, solo manda el link).

## Pasos

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. Tab **Magic Link**
3. Reemplazá el contenido por esto:

```html
<h2>Tu código LUXUR Ops</h2>

<p>Hola,</p>
<p>Tu código de acceso es:</p>

<p style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold;
          letter-spacing: 0.4em; background: #edebe6; padding: 18px 24px;
          border-radius: 12px; text-align: center; margin: 24px 0;">
  {{ .Token }}
</p>

<p>Pégalo en la app para entrar. El código expira en 1 hora.</p>

<p style="color: #999; font-size: 12px; margin-top: 32px;">
  Si vos no pediste este código, ignorá este email.
</p>

<p style="color: #999; font-size: 11px; margin-top: 24px; letter-spacing: 0.1em;">
  LUXUR · Content Operations
</p>
```

4. **Save**

## Subject (opcional)

En el campo "Subject" arriba, podés poner:

```
Tu código LUXUR Ops · {{ .Token }}
```

Así el código aparece también en el asunto del email (útil para verlo desde
la pre-vista del inbox sin abrir el correo).

## Probar

1. Andá a la app, pone tu email, dale Enviar código
2. Revisá tu inbox — el email debería tener el código grande en rosa-cream
3. Pegá el código en la app
4. Listo

## Notas técnicas

- `signInWithOtp({ email })` manda el email con el código (sin cambios en el call)
- `verifyOtp({ email, token: code, type: 'email' })` valida el código
- El código tiene 6 dígitos numéricos y expira en 1 hora
- Cada nuevo "Enviar código" invalida el anterior
- Esto NO depende de Universal Links, redirect URLs, ni de pre-fetch del email
