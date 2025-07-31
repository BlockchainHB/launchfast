export interface CommunicationTemplate {
  id: string
  user_id: string
  category: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface TemplateCategory {
  name: string
  templates: CommunicationTemplate[]
}

export interface CreateTemplateRequest {
  category: string
  title: string
  content: string
}

export interface UpdateTemplateRequest {
  category?: string
  title?: string
  content?: string
}

export interface TemplateApiResponse {
  success: boolean
  data?: CommunicationTemplate | CommunicationTemplate[]
  error?: string
  message?: string
}