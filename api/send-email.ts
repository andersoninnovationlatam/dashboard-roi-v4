import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Handler compatível com Vercel Serverless Functions
export default async function handler(req: any, res: any) {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, type, organizationName } = req.body;

    // Validação
    if (!to || !type) {
      return res.status(400).json({ error: 'Missing required fields: to, type' });
    }

    if (!['welcome', 'role_change'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "welcome" or "role_change"' });
    }

    // Templates de e-mail
    const emailTemplates = {
      welcome: {
        subject: `Bem-vindo(a) à ${organizationName || 'nossa plataforma'}!`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo(a)</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: 2px;">ROI ANALYTICS</h1>
              <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">Innovation Latam</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 700;">Bem-vindo(a)!</h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                Você foi adicionado(a) à equipe da <strong>${organizationName || 'nossa organização'}</strong> na plataforma ROI Analytics Pro.
              </p>
              <p style="margin: 0 0 30px; color: #475569; font-size: 16px; line-height: 1.6;">
                Nossa plataforma permite mensurar o retorno sobre investimento (ROI) de iniciativas de IA, transformando métricas de produtividade e eficiência em valores financeiros.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${process.env.APP_URL || 'https://your-app-url.com'}/login" style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
                      Acessar Plataforma
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Se você não esperava receber este e-mail, pode ignorá-lo com segurança.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                © ${new Date().getFullYear()} ROI Analytics Pro - Innovation Latam
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      },
      role_change: {
        subject: `Sua função foi atualizada na ${organizationName || 'plataforma'}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Função Atualizada</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: 2px;">ROI ANALYTICS</h1>
              <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">Innovation Latam</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 700;">Sua Função Foi Atualizada</h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                Sua função na equipe da <strong>${organizationName || 'nossa organização'}</strong> foi atualizada na plataforma ROI Analytics Pro.
              </p>
              <p style="margin: 0 0 30px; color: #475569; font-size: 16px; line-height: 1.6;">
                Você pode acessar a plataforma para verificar suas novas permissões e funcionalidades disponíveis.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${process.env.APP_URL || 'https://your-app-url.com'}/login" style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
                      Acessar Plataforma
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Se você não esperava receber este e-mail, entre em contato com o administrador da sua organização.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                © ${new Date().getFullYear()} ROI Analytics Pro - Innovation Latam
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      },
    };

    const template = emailTemplates[type as keyof typeof emailTemplates];

    // Enviar e-mail via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ROI Analytics <contato@aaspia.com.br>',
      to: [to],
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error('Erro ao enviar e-mail via Resend:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      id: data?.id,
    });
  } catch (error: any) {
    console.error('Erro na API de envio de e-mail:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
}
