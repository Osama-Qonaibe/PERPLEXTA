import type { SupportedLang } from './request.js';

interface AuthMdStrings {
  intro: (baseUrl: string) => string;
  agentAuthDesc: string;
  discoverTitle: string;
  discoverDesc: string;
  registerTitle: string;
  registerDesc: string;
  claimTitle: string;
  claimDesc: string;
  revokeTitle: string;
  revokeDesc: string;
  moreInfoTitle: string;
  protocolLabel: string;
  githubLabel: string;
}

const translations: Record<SupportedLang, AuthMdStrings> = {
  ar: {
    intro: (u) => `هذا هو مستند تسجيل الوكيل لـ ${u}.`,
    agentAuthDesc: 'يمكن للوكلاء التسجيل نيابة عن المستخدمين باستخدام هذه الخدمة.',
    discoverTitle: 'Discover (الاكتشاف)',
    discoverDesc: 'جلب البيانات التعريفية لخادم المصادقة لاكتشاف نقاط نهاية التسجيل:',
    registerTitle: 'Register (التسجيل)',
    registerDesc: 'إرسال طلب POST لتسجيل وكيل جديد:',
    claimTitle: 'Claim (المطالبة والمطابقة)',
    claimDesc: 'ربط وثيقة الاعتماد بهوية مستخدم تم التحقق منها:',
    revokeTitle: 'Revoke (إبطال الصلاحية)',
    revokeDesc: 'إبطال وثيقة اعتماد:',
    moreInfoTitle: 'More Info (مزيد من المعلومات)',
    protocolLabel: 'Protocol (البروتوكول)',
    githubLabel: 'GitHub (جيت هاب)',
  },
  en: {
    intro: (u) => `This is the agent registration document for ${u}.`,
    agentAuthDesc: 'Agents can register on behalf of users using this service.',
    discoverTitle: 'Discover',
    discoverDesc: 'Fetch the authorization server metadata to discover registration endpoints:',
    registerTitle: 'Register',
    registerDesc: 'Send a POST request to register an agent:',
    claimTitle: 'Claim',
    claimDesc: 'Bind the credential to a verified user identity:',
    revokeTitle: 'Revoke',
    revokeDesc: 'Revoke a credential:',
    moreInfoTitle: 'More Info',
    protocolLabel: 'Protocol',
    githubLabel: 'GitHub',
  },
  fr: {
    intro: (u) => `Ceci est le document d'enregistrement de l'agent pour ${u}.`,
    agentAuthDesc: "Les agents peuvent s'enregistrer au nom des utilisateurs via ce service.",
    discoverTitle: 'Discover (Découvrir)',
    discoverDesc: "Récupérer les métadonnées du serveur d'autorisation pour découvrir les points de terminaison d'enregistrement :",
    registerTitle: "Register (S'enregistrer)",
    registerDesc: 'Envoyer une requête POST pour enregistrer un agent :',
    claimTitle: 'Claim (Revendiquer)',
    claimDesc: "Associer l'identifiant à une identité utilisateur vérifiée :",
    revokeTitle: 'Revoke (Révoquer)',
    revokeDesc: 'Révoquer un identifiant :',
    moreInfoTitle: "More Info (Plus d'infos)",
    protocolLabel: 'Protocole',
    githubLabel: 'GitHub',
  },
  es: {
    intro: (u) => `Este es el documento de registro de agentes para ${u}.`,
    agentAuthDesc: 'Los agentes pueden registrarse en nombre de los usuarios utilizando este servicio.',
    discoverTitle: 'Discover (Descubrir)',
    discoverDesc: 'Obtener los metadatos del servidor de autorización para descubrir los endpoints de registro:',
    registerTitle: 'Register (Registrar)',
    registerDesc: 'Enviar una solicitud POST para registrar un agente:',
    claimTitle: 'Claim (Reclamar)',
    claimDesc: 'Asociar la credencial con una identidad de usuario verificada:',
    revokeTitle: 'Revoke (Revocar)',
    revokeDesc: 'Revocar una credencial:',
    moreInfoTitle: 'More Info (Más información)',
    protocolLabel: 'Protocolo',
    githubLabel: 'GitHub',
  },
  de: {
    intro: (u) => `Dies ist das Agenten-Registrierungsdokument für ${u}.`,
    agentAuthDesc: 'Agenten können sich im Namen von Benutzern über diesen Dienst registrieren.',
    discoverTitle: 'Discover (Entdecken)',
    discoverDesc: 'Abrufen der Metadaten des Autorisierungsservers, um Registrierungs-Endpunkte zu ermitteln:',
    registerTitle: 'Register (Registrieren)',
    registerDesc: 'Senden Sie eine POST-Anfrage, um einen Agenten zu registrieren:',
    claimTitle: 'Claim (Beanspruchen)',
    claimDesc: 'Verknüpfen Sie das Berechtigungsnachweis-Token mit einer verifizierten Benutzeridentität:',
    revokeTitle: 'Revoke (Widerrufen)',
    revokeDesc: 'Widerrufen eines Berechtigungsnachweises:',
    moreInfoTitle: 'More Info (Weitere Informationen)',
    protocolLabel: 'Protokoll',
    githubLabel: 'GitHub',
  },
};

/**
 * Generates the auth.md document for AI agent discovery.
 * Single template — localised via the translations map above.
 */
export function generateAuthMd(baseUrl: string, lang: SupportedLang | string): string {
  const t = translations[(lang as SupportedLang)] ?? translations['en'];

  return [
    '# auth.md',
    '',
    t.intro(baseUrl),
    '',
    '## agent_auth',
    '',
    t.agentAuthDesc,
    '',
    `- register_uri: ${baseUrl}/api/auth/agent-register`,
    '- identity_types_supported: anonymous, identity_assertion',
    '- credential_types_supported: api_key, access_token',
    `- claim_uri: ${baseUrl}/api/auth/claim`,
    `- revocation_uri: ${baseUrl}/api/auth/revoke`,
    '',
    `## ${t.discoverTitle}`,
    '',
    t.discoverDesc,
    '',
    '```http',
    `GET ${baseUrl}/.well-known/oauth-protected-resource`,
    `GET ${baseUrl}/.well-known/oauth-authorization-server`,
    '```',
    '',
    `## ${t.registerTitle}`,
    '',
    t.registerDesc,
    '',
    '```http',
    `POST ${baseUrl}/api/auth/agent-register`,
    'Content-Type: application/json',
    '',
    '{',
    '  "client_name": "My Agent",',
    '  "identity_type": "anonymous",',
    '  "credential_type": "api_key",',
    '  "scopes": ["read", "write"]',
    '}',
    '```',
    '',
    `## ${t.claimTitle}`,
    '',
    t.claimDesc,
    '',
    '```http',
    `POST ${baseUrl}/api/auth/claim`,
    'Content-Type: application/json',
    'Authorization: Bearer <api_key>',
    '',
    '{',
    '  "identity_type": "identity_assertion",',
    '  "assertion": "<id_jag_token>"',
    '}',
    '```',
    '',
    `## ${t.revokeTitle}`,
    '',
    t.revokeDesc,
    '',
    '```http',
    `POST ${baseUrl}/api/auth/revoke`,
    'Content-Type: application/json',
    'Authorization: Bearer <api_key>',
    '',
    '{',
    '  "client_id": "agent_..."',
    '}',
    '```',
    '',
    `## ${t.moreInfoTitle}`,
    '',
    `- ${t.protocolLabel}: https://workos.com/auth-md`,
    `- ${t.githubLabel}: https://github.com/workos/auth.md`,
  ].join('\n');
}
