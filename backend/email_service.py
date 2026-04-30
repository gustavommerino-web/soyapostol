"""Transactional email via Resend.

All outbound email for soyapostol goes through this module. The Resend SDK
is synchronous so we wrap sends in ``asyncio.to_thread`` to keep the
FastAPI event loop responsive.

Password-reset is the only transactional email we send today. Templates
are bilingual (ES/EN) and use inline styles so they render reliably across
Gmail, Outlook, Apple Mail and mobile clients.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

import resend

logger = logging.getLogger(__name__)

# Inline style snippets so the email looks cohesive without external CSS.
_BRAND_COLOR = "#B33A3A"        # sangre
_BG_COLOR = "#FDFDFD"           # sand-50
_TEXT_COLOR = "#2D3436"          # stone-900
_MUTED_COLOR = "#636E72"         # stone-muted
_FONT_SERIF = "'Merriweather', Georgia, serif"
_FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"


def _is_configured() -> bool:
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("SENDER_EMAIL")
    return bool(api_key) and bool(sender)


def _build_reset_email(lang: str, reset_url: str, ttl_minutes: int) -> tuple[str, str, str]:
    """Return (subject, html_body, text_body) for the password-reset email."""
    if lang == "en":
        subject = "Reset your soyapostol password"
        intro = "We received a request to reset the password for your soyapostol account."
        cta = "Reset password"
        note_ttl = f"This link will expire in {ttl_minutes} minutes."
        note_ignore = "If you didn't request this, you can safely ignore this email — your password won't change."
        footer_note = "You're receiving this email because a password-reset was requested for your soyapostol account."
        brand_tag = "Companion for Catholic daily life"
    else:
        subject = "Restablece tu contraseña de soyapostol"
        intro = "Recibimos una solicitud para restablecer la contraseña de tu cuenta de soyapostol."
        cta = "Restablecer contraseña"
        note_ttl = f"Este enlace caducará en {ttl_minutes} minutos."
        note_ignore = "Si tú no solicitaste este cambio, puedes ignorar este correo — tu contraseña no se modificará."
        footer_note = "Recibes este correo porque se solicitó un restablecimiento de contraseña para tu cuenta de soyapostol."
        brand_tag = "Compañero para la vida católica diaria"

    html_body = f"""\
<!doctype html>
<html lang="{lang}">
<body style="margin:0;padding:0;background-color:{_BG_COLOR};font-family:{_FONT_SANS};color:{_TEXT_COLOR};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{_BG_COLOR};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border:1px solid #E7E4DD;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background-color:{_BRAND_COLOR};padding:20px 28px;">
              <div style="color:#FFFFFF;font-family:{_FONT_SERIF};font-size:22px;font-weight:700;letter-spacing:-0.3px;">soyapostol</div>
              <div style="color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin-top:4px;">{brand_tag}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 16px 28px;">
              <h1 style="font-family:{_FONT_SERIF};font-size:26px;line-height:1.3;margin:0 0 16px 0;color:{_TEXT_COLOR};">{subject}</h1>
              <p style="font-size:15px;line-height:1.65;margin:0 0 22px 0;color:{_TEXT_COLOR};">{intro}</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px;background-color:{_BRAND_COLOR};">
                    <a href="{reset_url}" target="_blank"
                       style="display:inline-block;padding:12px 26px;font-family:{_FONT_SANS};font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;letter-spacing:0.3px;">
                      {cta}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;color:{_MUTED_COLOR};margin:22px 0 8px 0;">{note_ttl}</p>
              <p style="font-size:13px;color:{_MUTED_COLOR};margin:0 0 6px 0;word-break:break-all;">
                <a href="{reset_url}" target="_blank" style="color:{_BRAND_COLOR};text-decoration:none;">{reset_url}</a>
              </p>
              <p style="font-size:13px;color:{_MUTED_COLOR};margin:22px 0 0 0;">{note_ignore}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px 28px;border-top:1px solid #EFEDE8;">
              <p style="font-size:12px;color:{_MUTED_COLOR};margin:0;line-height:1.6;">{footer_note}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text_body = (
        f"{subject}\n\n"
        f"{intro}\n\n"
        f"{reset_url}\n\n"
        f"{note_ttl}\n"
        f"{note_ignore}\n"
    )
    return subject, html_body, text_body


async def send_password_reset_email(
    *, to_email: str, reset_url: str, ttl_minutes: int, lang: str = "es",
) -> Optional[str]:
    """Send the password-reset email. Returns the Resend message id on
    success, or None if email is not configured or the provider fails.

    This never raises — authentication flows should not leak provider
    failures back to users (and they complete correctly even if email was
    skipped, since the token is already stored).
    """
    if not _is_configured():
        logger.warning("Resend not configured — skipping password-reset email to %s", to_email)
        return None

    resend.api_key = os.environ["RESEND_API_KEY"]
    sender = os.environ["SENDER_EMAIL"]
    subject, html_body, text_body = _build_reset_email(lang, reset_url, ttl_minutes)

    params = {
        "from": f"soyapostol <{sender}>",
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }

    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        msg_id = result.get("id") if isinstance(result, dict) else None
        logger.info("Password-reset email sent to %s (message id=%s)", to_email, msg_id)
        return msg_id
    except Exception as e:  # noqa: BLE001 — intentional catch-all; never leaks upstream
        logger.error("Failed to send password-reset email to %s: %s", to_email, e)
        return None
