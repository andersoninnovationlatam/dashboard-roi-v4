import { Resend } from 'npm:resend@4.8.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
    // ===============================
    // CORS / PREFLIGHT
    // ===============================
    if (req.method === 'OPTIONS') {
        return new Response('ok', { status: 200, headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', {
            status: 405,
            headers: corsHeaders,
        })
    }

    // ===============================
    // ENV VALIDATION
    // ===============================
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!resendKey || !supabaseUrl || !serviceRoleKey) {
        return new Response(
            JSON.stringify({ error: 'Missing environment variables' }),
            { status: 500, headers: corsHeaders }
        )
    }

    const resend = new Resend(resendKey)
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // ===============================
    // BODY
    // ===============================
    const body = await req.json()
    const { to, type, organizationName, oldRole, newRole, fullName } = body

    if (!to || !type) {
        return new Response('Invalid payload', {
            status: 400,
            headers: corsHeaders,
        })
    }

    // ===============================
    // INVITE LINK (WELCOME)
    // ===============================
    let actionLink = '#'

    if (type === 'welcome') {
        // Usar inviteUserByEmail que cria o usuário automaticamente se não existir
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: to,
            options: {
                redirectTo: 'https://dashboard-roi-v4.vercel.app/#/login',
            },
        })

        if (linkError) {
            return new Response(JSON.stringify({ error: linkError.message }), {
                status: 500,
                headers: corsHeaders,
            })
        }

        actionLink = linkData.properties.action_link

    }

    // ===============================
    // EMAIL TEMPLATES
    // ===============================
    const templates: Record<
        string,
        { subject: string; html: string }
    > = {
        welcome: {
            subject: `Bem-vindo à ${organizationName ?? 'ROI Analytics'}!`,
            html: `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:30px;text-align:center;background:#4f46e5;color:#fff;">
              <h1 style="margin:0;">ROI Analytics</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2>Bem-vindo!</h2>
              <p>Seu acesso à plataforma foi criado com sucesso.</p>

              <div style="text-align:center;margin:40px 0;">
                <a href="${actionLink}"
                   style="background:#6366f1;color:#fff;padding:14px 28px;
                          text-decoration:none;border-radius:8px;font-weight:600;">
                  Criar senha e acessar a plataforma
                </a>
              </div>

              <p>Se você não esperava este convite, pode ignorar este e-mail.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;text-align:center;background:#f8fafc;font-size:14px;color:#64748b;">
              © ${new Date().getFullYear()} ROI Analytics
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
            subject: 'Sua função foi alterada',
            html: `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" style="background:#ffffff;border-radius:12px;">
          <tr>
            <td style="padding:30px;text-align:center;background:#4f46e5;color:#fff;">
              <h1>Função alterada</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p>Sua função foi atualizada:</p>
              <p><strong>${oldRole}</strong> → <strong>${newRole}</strong></p>
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
    }

    const template = templates[type]

    if (!template) {
        return new Response('Invalid type', {
            status: 400,
            headers: corsHeaders,
        })
    }

    // ===============================
    // SEND EMAIL
    // ===============================
    const { error } = await resend.emails.send({
        from: 'ROI Analytics <contato@aaspia.com.br>',
        to,
        subject: template.subject,
        html: template.html,
    })

    if (error) {
        return new Response(JSON.stringify(error), {
            status: 500,
            headers: corsHeaders,
        })
    }

    return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: corsHeaders }
    )
})
