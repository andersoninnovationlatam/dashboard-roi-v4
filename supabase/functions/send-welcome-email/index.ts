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
  const { to, type, organizationName, oldRole, newRole, fullName, password } = body


  if (!to || !type) {
    return new Response('Invalid payload', {
      status: 400,
      headers: corsHeaders,
    })
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
             <h2 style="margin-top:0;color:#1e293b;">Bem-vindo${fullName ? `, ${fullName}` : ''}!</h2>
             <p style="color:#475569;line-height:1.6;">Seu acesso à plataforma foi criado com sucesso.</p>
            
             <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:8px;padding:24px;margin:30px 0;">
               <p style="margin:0 0 12px 0;font-weight:bold;color:#475569;font-size:14px;">Suas credenciais de acesso:</p>
               <table width="100%" cellpadding="0" cellspacing="0">
                 <tr>
                   <td style="padding:8px 0;color:#64748b;font-size:14px;"><strong style="color:#334155;">E-mail:</strong></td>
                   <td style="padding:8px 0;color:#1e293b;font-size:14px;font-family:monospace;">${to}</td>
                 </tr>
                 <tr>
                   <td style="padding:8px 0;color:#64748b;font-size:14px;"><strong style="color:#334155;">Senha:</strong></td>
                   <td style="padding:8px 0;">
                     <code style="background:#fff;padding:6px 12px;border-radius:4px;font-family:monospace;font-size:16px;color:#1e293b;font-weight:bold;letter-spacing:1px;border:1px solid #cbd5e1;">${password?.trim() || 'N/A'}</code>
                   </td>
                 </tr>
               </table>
             </div>


             <div style="text-align:center;margin:40px 0;">
               <a href="https://dashboard-roi-v4.vercel.app/#/login"
                  style="background:#6366f1;color:#fff;padding:14px 28px;
                         text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">
                 Acessar a plataforma
               </a>
             </div>


             <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin:30px 0;border-radius:4px;">
               <p style="margin:0;color:#92400e;font-weight:bold;font-size:14px;">⚠️ Importante:</p>
               <p style="margin:8px 0 0 0;color:#78350f;font-size:13px;line-height:1.5;">Guarde estas credenciais em local seguro e altere sua senha após o primeiro acesso através das configurações da plataforma.</p>
             </div>


             <p style="color:#64748b;font-size:13px;margin-top:20px;line-height:1.5;">Se você não esperava este convite, entre em contato com o administrador da organização.</p>
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



