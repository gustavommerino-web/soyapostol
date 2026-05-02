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



# ----------------------------------------------------------------------
# Account-deletion farewell email
# ----------------------------------------------------------------------

def _build_farewell_email(lang: str, name: str) -> tuple[str, str, str]:
    if lang == "en":
        subject = "Your soyapostol account has been deleted"
        greeting = f"Hello {name},"
        intro = "We confirm that your soyapostol account has been permanently deleted, along with all associated data (favorites, sessions, and identifiers)."
        body = "It was an honour to walk this stretch of the journey with you. The doors stay open: if one day you wish to return, you can register again with the same email."
        farewell = "May Mary, Mother of the Church, watch over you."
        sig = "— The soyapostol team"
        brand_tag = "Companion for Catholic daily life"
    else:
        subject = "Tu cuenta de soyapostol ha sido eliminada"
        greeting = f"Hola {name},"
        intro = "Confirmamos que tu cuenta de soyapostol ha sido eliminada de forma permanente, junto con todos los datos asociados (favoritos, sesiones e identificadores)."
        body = "Ha sido un honor caminar este tramo del camino contigo. Las puertas quedan abiertas: si algún día deseas volver, puedes registrarte nuevamente con el mismo correo."
        farewell = "Que María, Madre de la Iglesia, te acompañe."
        sig = "— El equipo de soyapostol"
        brand_tag = "Compañero para la vida católica diaria"

    html_body = f"""<!DOCTYPE html>
<html lang="{lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{subject}</title></head>
<body style="margin:0;padding:0;background:{_BG_COLOR};font-family:{_FONT_SANS};color:{_TEXT_COLOR};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_BG_COLOR};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #DFE4EA;border-radius:8px;padding:32px;">
        <tr><td style="font-family:{_FONT_SERIF};font-size:22px;font-weight:700;color:{_BRAND_COLOR};letter-spacing:0.3px;padding-bottom:24px;border-bottom:1px solid #EFE9DD;">soyapostol</td></tr>
        <tr><td style="padding:24px 0 12px;font-size:16px;">{greeting}</td></tr>
        <tr><td style="padding:0 0 16px;font-size:15px;line-height:1.6;color:{_TEXT_COLOR};">{intro}</td></tr>
        <tr><td style="padding:0 0 16px;font-size:15px;line-height:1.6;color:{_TEXT_COLOR};">{body}</td></tr>
        <tr><td style="padding:8px 0 0;font-family:{_FONT_SERIF};font-style:italic;font-size:15px;color:{_MUTED_COLOR};">{farewell}</td></tr>
        <tr><td style="padding:24px 0 0;font-size:14px;color:{_MUTED_COLOR};">{sig}</td></tr>
        <tr><td style="padding-top:32px;border-top:1px solid #EFE9DD;font-size:12px;color:{_MUTED_COLOR};text-align:center;">{brand_tag}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    text_body = f"{subject}\n\n{greeting}\n\n{intro}\n\n{body}\n\n{farewell}\n\n{sig}\n"
    return subject, html_body, text_body


async def send_account_deleted_email(
    *, to_email: str, name: str, lang: str = "es",
) -> Optional[str]:
    """Best-effort farewell email after account deletion. Never raises."""
    if not _is_configured():
        logger.warning("Resend not configured — skipping farewell email to %s", to_email)
        return None
    resend.api_key = os.environ["RESEND_API_KEY"]
    sender = os.environ["SENDER_EMAIL"]
    subject, html_body, text_body = _build_farewell_email(lang, name)
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
        logger.info("Account-deleted email sent to %s (message id=%s)", to_email, msg_id)
        return msg_id
    except Exception as e:  # noqa: BLE001
        logger.error("Failed to send account-deleted email to %s: %s", to_email, e)
        return None
