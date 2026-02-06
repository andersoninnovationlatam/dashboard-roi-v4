import { Resend } from 'npm:resend@4.8.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
    // ✅ PRE-FLIGHT (ESSENCIAL)
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            status: 200,
            headers: corsHeaders,
        });
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', {
            status: 405,
            headers: corsHeaders,
        });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
        return new Response('Missing RESEND_API_KEY', {
            status: 500,
            headers: corsHeaders,
        });
    }

    const resend = new Resend(apiKey);

    const body = await req.json();
    const { to, type, organizationName, oldRole, newRole } = body;

    if (!to || !type) {
        return new Response('Invalid payload', {
            status: 400,
            headers: corsHeaders,
        });
    }

    const templates: Record<string, { subject: string; html: string }> = {
        welcome: {
            subject: `Bem-vindo à ${organizationName ?? 'ROI Analytics'}!`,
            html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; line-height: 1.6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 600px;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">ROI Analytics</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #0f172a; font-size: 24px; font-weight: 700; line-height: 1.3;">
                                Bem-vindo à ${organizationName ?? 'plataforma'}!
                            </h2>
                            <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                                Seu acesso foi criado com sucesso na plataforma ROI Analytics.
                            </p>
                            <p style="margin: 0 0 30px; color: #475569; font-size: 16px; line-height: 1.6;">
                                Você já pode acessar o sistema e começar a gerenciar seus projetos de IA e análises de ROI.
                            </p>
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="#" style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">Acessar Plataforma</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                            <p style="margin: 0; color: #64748b; font-size: 14px; text-align: center; line-height: 1.5;">
                                Este é um e-mail automático. Por favor, não responda.<br>
                                <span style="color: #94a3b8;">© ${new Date().getFullYear()} ROI Analytics. Todos os direitos reservados.</span>
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
            subject: `Sua função foi alterada - ${organizationName ?? 'ROI Analytics'}`,
            html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Função Alterada</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; line-height: 1.6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 600px;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">ROI Analytics</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #0f172a; font-size: 24px; font-weight: 700; line-height: 1.3;">
                                Sua função foi alterada
                            </h2>
                            <p style="margin: 0 0 30px; color: #475569; font-size: 16px; line-height: 1.6;">
                                Sua função na <strong style="color: #0f172a;">${organizationName ?? 'plataforma'}</strong> foi atualizada.
                            </p>
                            <!-- Role Change Card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; border: 2px solid #e2e8f0; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 30px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td width="45%" style="padding: 0 10px 0 0; vertical-align: middle;">
                                                    <div style="text-align: center;">
                                                        <div style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; border-radius: 6px; margin-bottom: 10px;">
                                                            <span style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Função Anterior</span>
                                                        </div>
                                                        <div style="padding: 12px 20px; background-color: #ffffff; border-radius: 8px; border: 2px solid #e2e8f0;">
                                                            <span style="color: #64748b; font-size: 18px; font-weight: 600;">${oldRole ?? 'Não informada'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td width="10%" align="center" style="padding: 0 10px; vertical-align: middle;">
                                                    <div style="font-size: 24px; color: #6366f1; font-weight: 700;">→</div>
                                                </td>
                                                <td width="45%" style="padding: 0 0 0 10px; vertical-align: middle;">
                                                    <div style="text-align: center;">
                                                        <div style="display: inline-block; padding: 8px 16px; background-color: #ede9fe; border-radius: 6px; margin-bottom: 10px;">
                                                            <span style="color: #6366f1; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Nova Função</span>
                                                        </div>
                                                        <div style="padding: 12px 20px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 8px; box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);">
                                                            <span style="color: #ffffff; font-size: 18px; font-weight: 700;">${newRole ?? 'Não informada'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                As permissões e funcionalidades disponíveis foram atualizadas de acordo com sua nova função.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                            <p style="margin: 0; color: #64748b; font-size: 14px; text-align: center; line-height: 1.5;">
                                Este é um e-mail automático. Por favor, não responda.<br>
                                <span style="color: #94a3b8;">© ${new Date().getFullYear()} ROI Analytics. Todos os direitos reservados.</span>
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

    const template = templates[type];
    if (!template) {
        return new Response('Invalid type', {
            status: 400,
            headers: corsHeaders,
        });
    }

    const { error } = await resend.emails.send({
        from: 'ROI Analytics <contato@aaspia.com.br>',
        to,
        subject: template.subject,
        html: template.html,
    });

    if (error) {
        return new Response(JSON.stringify(error), {
            status: 500,
            headers: corsHeaders,
        });
    }

    return new Response(
        JSON.stringify({ success: true }),
        {
            status: 200,
            headers: corsHeaders,
        }
    );
});
