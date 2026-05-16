export type TemplateVariables = {
  lead_company_name: string
  user_company_name: string
  user_name: string
}

export function renderTemplate(text: string, vars: TemplateVariables): string {
  return text
    .replace(/\{\{lead_company_name\}\}/g, vars.lead_company_name)
    .replace(/\{\{user_company_name\}\}/g, vars.user_company_name)
    .replace(/\{\{user_name\}\}/g, vars.user_name)
}
