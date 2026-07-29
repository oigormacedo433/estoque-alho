export type AdminNavigationItem = {
  label: string;
  href: string;
  path: string;
  url: string;
  to: string;
  description: string;
  icon?: string;
};

export type AdminNavigationSection = {
  label: string;
  title: string;
  items: AdminNavigationItem[];
};

function createAdminNavigationItem(params: {
  label: string;
  href: string;
  description: string;
  icon?: string;
}): AdminNavigationItem {
  return {
    ...params,
    path: params.href,
    url: params.href,
    to: params.href,
  };
}

export const adminNavigationSections: AdminNavigationSection[] = [
  {
    label: "Visão geral",
    title: "Visão geral",
    items: [
      createAdminNavigationItem({
        label: "Painel",
        href: "/admin",
        description: "Resumo administrativo da plataforma.",
        icon: "LayoutDashboard",
      }),
    ],
  },
  {
    label: "Comercial",
    title: "Comercial",
    items: [
      createAdminNavigationItem({
        label: "Leads",
        href: "/admin/leads",
        description: "Contatos comerciais recebidos pela landing page.",
        icon: "UserRoundPlus",
      }),
      createAdminNavigationItem({
        label: "Criar assinatura",
        href: "/admin/provisionamento",
        description: "Criação de empresa, conta principal e assinatura.",
        icon: "FilePlus2",
      }),
      createAdminNavigationItem({
        label: "Empresas",
        href: "/admin/empresas",
        description: "Empresas cadastradas na plataforma.",
        icon: "Building2",
      }),
      createAdminNavigationItem({
        label: "Planos",
        href: "/admin/planos",
        description: "Planos comerciais disponíveis.",
        icon: "BadgeDollarSign",
      }),
      createAdminNavigationItem({
        label: "Assinaturas",
        href: "/admin/assinaturas",
        description: "Assinaturas comerciais das empresas.",
        icon: "ScrollText",
      }),
      createAdminNavigationItem({
        label: "Cobranças",
        href: "/admin/cobrancas",
        description: "Cobranças e pagamentos comerciais.",
        icon: "ReceiptText",
      }),
      createAdminNavigationItem({
        label: "Testes",
        href: "/admin/trials",
        description: "Períodos de teste das empresas.",
        icon: "Clock3",
      }),
    ],
  },
  {
    label: "Controle",
    title: "Controle",
    items: [
      createAdminNavigationItem({
        label: "Usuários",
        href: "/admin/usuarios",
        description: "Usuários vinculados às empresas.",
        icon: "UsersRound",
      }),
      createAdminNavigationItem({
        label: "Logs",
        href: "/admin/logs",
        description: "Eventos operacionais da plataforma.",
        icon: "Activity",
      }),
      createAdminNavigationItem({
        label: "Auditoria",
        href: "/admin/auditoria",
        description: "Histórico de ações administrativas.",
        icon: "ShieldCheck",
      }),
    ],
  },
  {
    label: "Sistema",
    title: "Sistema",
    items: [
      createAdminNavigationItem({
        label: "Privacidade",
        href: "/admin/privacidade",
        description: "Controles de segurança e privacidade.",
        icon: "LockKeyhole",
      }),
      createAdminNavigationItem({
        label: "Configurações",
        href: "/admin/configuracoes",
        description: "Ajustes globais da plataforma.",
        icon: "Settings",
      }),
      createAdminNavigationItem({
        label: "Saúde",
        href: "/admin/saude",
        description: "Acompanhamento operacional da plataforma.",
        icon: "Gauge",
      }),
    ],
  },
];

export const adminNavigation = adminNavigationSections;
export const ADMIN_NAVIGATION = adminNavigationSections;

export function getAdminNavigationItem(pathname: string): AdminNavigationItem | null {
  const items = adminNavigationSections.flatMap((section) => section.items);

  const exactMatch = items.find((item) => item.href === pathname);

  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatches = items
    .filter((item) => item.href !== "/admin")
    .filter((item) => pathname.startsWith(`${item.href}/`))
    .sort((firstItem, secondItem) => secondItem.href.length - firstItem.href.length);

  return prefixMatches[0] ?? null;
}