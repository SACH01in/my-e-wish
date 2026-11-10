export type BrandedEmailContent = {
  preheader: string;
  title: string;
  greeting?: string;
  paragraphs?: string[];
  details?: Array<{ label: string; value: string }>;
  message?: string;
  action?: { label: string; url: string };
  finePrint?: string;
};

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] || character);
}

/** Creates the shared responsive, inline-styled my e-Wish email and text fallback. */
export function renderBrandedEmail(content: BrandedEmailContent): { html: string; text: string } {
  const safeAction = content.action ? getSafeAction(content.action) : null;
  const paragraphs = content.paragraphs || [];
  const details = content.details || [];
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeEmailHtml(content.title)}</title></head>
<body style="margin:0;padding:0;background-color:#f8f6f1;font-family:Arial,Helvetica,sans-serif;color:#292a25;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(content.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f6f1;">
    <tr><td align="center" style="padding:34px 14px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#fffefa;border:1px solid #e8e4db;">
        <tr><td align="center" style="padding:26px 28px 20px;border-bottom:1px solid #eee9df;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
            <td width="34" height="34" align="center" valign="middle" style="width:34px;height:34px;border-radius:50%;background-color:#b86f69;color:#ffffff;font-family:Georgia,serif;font-size:25px;font-style:italic;line-height:34px;">e</td>
            <td style="padding-left:10px;color:#31312a;font-family:Georgia,serif;font-size:22px;letter-spacing:-.5px;">my e-Wish</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:34px 36px 12px;">
          <p style="margin:0 0 11px;color:#9c8170;font-size:10px;font-weight:bold;letter-spacing:2px;text-align:center;">A LITTLE SOMETHING, MADE WITH CARE</p>
          <h1 style="margin:0;color:#393a33;font-family:Georgia,'Times New Roman',serif;font-size:31px;font-weight:normal;line-height:1.2;text-align:center;">${escapeEmailHtml(content.title)} <span style="color:#b86f69;">✳</span></h1>
        </td></tr>
        <tr><td style="padding:12px 36px 34px;color:#68675f;font-size:15px;line-height:1.75;">
          ${content.greeting ? `<p style="margin:0 0 15px;color:#45443d;">${escapeEmailHtml(content.greeting)}</p>` : ""}
          ${paragraphs.map((paragraph) => `<p style="margin:0 0 15px;">${escapeEmailHtml(paragraph)}</p>`).join("")}
          ${details.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;background-color:#faf8f3;border:1px solid #eee9df;">${details.map(({ label, value }) => `<tr><td valign="top" style="padding:11px 14px;border-bottom:1px solid #eee9df;color:#928b7f;font-size:12px;font-weight:bold;">${escapeEmailHtml(label)}</td><td valign="top" style="padding:11px 14px;border-bottom:1px solid #eee9df;color:#45443d;font-size:13px;overflow-wrap:anywhere;">${escapeEmailHtml(value)}</td></tr>`).join("")}</table>` : ""}
          ${content.message ? `<div style="margin:20px 0;padding:17px 18px;border-left:3px solid #b86f69;background-color:#faf8f3;color:#45443d;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeEmailHtml(content.message)}</div>` : ""}
          ${safeAction ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:26px auto 20px;"><tr><td align="center" bgcolor="#30332d" style="border-radius:3px;"><a href="${escapeEmailHtml(safeAction.url)}" style="display:inline-block;padding:14px 25px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">${escapeEmailHtml(safeAction.label)} &nbsp;↗</a></td></tr></table><p style="margin:0 0 15px;color:#928b7f;font-size:11px;line-height:1.6;text-align:center;overflow-wrap:anywhere;">If the button doesn’t work, copy this link into your browser:<br><a href="${escapeEmailHtml(safeAction.url)}" style="color:#9b5b55;">${escapeEmailHtml(safeAction.url)}</a></p>` : ""}
          ${content.finePrint ? `<p style="margin:22px 0 0;color:#8b877d;font-size:12px;line-height:1.65;">${escapeEmailHtml(content.finePrint)}</p>` : ""}
        </td></tr>
        <tr><td align="center" style="padding:19px 24px;border-top:1px solid #eee9df;color:#928d82;font-size:11px;line-height:1.6;">Made for the people who make life lovely.<br><span style="color:#b86f69;">♥</span> my e-Wish</td></tr>
      </table>
      <p style="max-width:560px;margin:15px auto 0;color:#aaa397;font-size:10px;line-height:1.5;text-align:center;">You received this message because of an action on my e-Wish. If it wasn’t you, you can safely ignore it.</p>
    </td></tr>
  </table>
</body>
</html>`;

  const textParts = [
    "my e-Wish",
    content.title,
    content.greeting,
    ...paragraphs,
    ...details.map(({ label, value }) => `${label}: ${value}`),
    content.message ? `Message:\n${content.message}` : undefined,
    safeAction ? `${safeAction.label}: ${safeAction.url}` : undefined,
    content.finePrint,
    "Made for the people who make life lovely. — my e-Wish",
  ].filter(Boolean);

  return { html, text: textParts.join("\n\n") };
}

function getSafeAction(action: { label: string; url: string }): { label: string; url: string } | null {
  try {
    const url = new URL(action.url);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return { label: action.label, url: url.toString() };
  } catch {
    return null;
  }
}
