'use client';

/*
 * AUTHENTIFICATION PAR COOKIE httpOnly
 *
 * Le jeton n'est plus stocké dans localStorage : il est déposé
 * par le serveur dans un cookie httpOnly, illisible par le
 * JavaScript de la page. Un script injecté ne peut donc plus
 * l'exfiltrer.
 *
 * Conséquences :
 * - plus rien à lire, écrire ou effacer côté client ;
 * - le cookie part automatiquement avec chaque requête, car
 *   toutes les URL sont relatives (/api/...) et passent par
 *   les rewrites Next.js, donc en same-origin ;
 * - la déconnexion doit appeler le serveur (api.logout) pour
 *   révoquer le jeton, un simple effacement local ne suffit
 *   plus — et c'est précisément le but.
 */

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getApiErrorMessage(
  data: any,
  fallback: string
): string {
  if (!data) return fallback;

  if (typeof data.detail === 'string') {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item: any) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item?.msg) {
          return item.msg;
        }

        return JSON.stringify(item);
      })
      .join(' ');
  }

  if (
    typeof data.detail === 'object' &&
    data.detail !== null
  ) {
    if (data.detail?.message) {
      return String(data.detail.message);
    }

    return JSON.stringify(data.detail);
  }

  if (typeof data.message === 'string') {
    return data.message;
  }

  return fallback;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body &&
    !(options.body instanceof FormData)
      ? {
          'Content-Type':
            'application/json',
        }
      : {}),
    ...((options.headers as Record<
      string,
      string
    >) || {}),
  };

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    // Le cookie de session est same-origin : il doit être
    // joint à chaque appel.
    credentials: 'same-origin',
  });

  if (!res.ok) {
    let detail = res.statusText;

    try {
      const data = await res.json();

      detail = getApiErrorMessage(
        data,
        detail
      );
    } catch {
      /* ignore */
    }

    throw new ApiError(
      detail,
      res.status
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  /* =========================================================
     AUTHENTIFICATION
     ========================================================= */

  /**
   * Déconnexion.
   *
   * Doit passer par le serveur : c'est lui qui révoque le
   * jeton et efface le cookie httpOnly. Un nettoyage
   * uniquement côté client laisserait le jeton utilisable
   * jusqu'à son expiration.
   */
  logout: () =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  login: (
    email: string,
    password: string
  ) =>
    request<{
      security_code?: string | null;
      must_change_password?: boolean;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    }),

  me: () =>
    request('/auth/me'),

  verifySecurityCode: (
    code: string
  ) =>
    request<{
      valid: boolean;
    }>('/auth/verify-security-code', {
      method: 'POST',
      body: JSON.stringify({
        code,
      }),
    }),

  forgotSecurityCode: (
    email: string,
    password: string
  ) =>
    request<{
      success: boolean;
    }>('/auth/forgot-security-code', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    }),

  changePassword: (
    currentPassword: string,
    newPassword: string
  ) =>
    request<{
      success: boolean;
    }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password:
          currentPassword,
        new_password: newPassword,
      }),
    }),

  forgotPassword: (
    email: string
  ) =>
    request<{
      success: boolean;
    }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
      }),
    }),

  verifyPasswordResetCode: (
    email: string,
    code: string
  ) =>
    request<{
      success: boolean;
      reset_token: string;
    }>('/auth/verify-password-reset-code', {
      method: 'POST',
      body: JSON.stringify({
        email,
        code,
      }),
    }),

  resetPassword: (
    resetToken: string,
    newPassword: string
  ) =>
    request<{
      success: boolean;
      must_change_password: boolean;
    }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        reset_token: resetToken,
        new_password: newPassword,
      }),
    }),

  /* =========================================================
     UTILISATEURS
     ========================================================= */

  listUsers: () =>
    request('/users'),

  createUser: (
    payload: unknown
  ) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUser: (
    id: string,
    payload: unknown
  ) =>
    request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteUser: (
    id: string
  ) =>
    request(`/users/${id}`, {
      method: 'DELETE',
    }),

  /* =========================================================
     ENTITÉS
     ========================================================= */

  listEntities: () =>
    request('/entities'),

  createEntity: (
    payload: unknown
  ) =>
    request('/entities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteEntity: (
    id: string
  ) =>
    request(`/entities/${id}`, {
      method: 'DELETE',
    }),

  /* =========================================================
     MISSIONS
     ========================================================= */

  listMissions: () =>
    request('/missions'),

  createMission: (
    payload: unknown
  ) =>
    request('/missions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteMission: (
    id: string
  ) =>
    request(`/missions/${id}`, {
      method: 'DELETE',
    }),

  getMission: (
    id: string
  ) =>
    request(`/missions/${id}`),

  listMissionMembers: (
    id: string
  ) =>
    request(`/missions/${id}/members`),

  updateMissionMembers: (
    id: string,
    member_ids: string[]
  ) =>
    request(`/missions/${id}/members`, {
      method: 'PUT',
      body: JSON.stringify({
        member_ids,
      }),
    }),

  /* =========================================================
     QUESTIONNAIRE
     ========================================================= */

  getStructure: () =>
    request(
      '/questionnaire/structure'
    ),

  getAnswers: (
    missionId: string
  ) =>
    request(
      `/questionnaire/missions/${missionId}/answers`
    ),

  saveAnswer: (
    missionId: string,
    questionId: string,
    value: unknown,
    comment?: string | null
  ) =>
    request(
      `/questionnaire/missions/${missionId}/answers/${questionId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          question_id: questionId,
          value,
          comment: comment ?? null,
        }),
      }
    ),

  /* =========================================================
     DOCUMENTS
     ========================================================= */

  listDocuments: (
    missionId: string
  ) =>
    request(
      `/documents/missions/${missionId}`
    ),

  uploadDocument: async (
    missionId: string,
    nodeId: string,
    file: File,
    options?: {
      category?: 'recus' | 'travaux';
      questionId?: string;
    }
  ) => {
    const formData =
      new FormData();

    formData.append(
      'node_id',
      String(nodeId).trim()
    );

    formData.append(
      'category',
      options?.category ??
        'recus'
    );

    if (options?.questionId) {
      formData.append(
        'question_id',
        String(
          options.questionId
        ).trim()
      );
    }

    formData.append(
      'file',
      file
    );

    const res = await fetch(
      `/api/documents/missions/${missionId}/upload`,
      {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      }
    );

    if (!res.ok) {
      let detail =
        res.statusText;

      try {
        const data =
          await res.json();

        detail =
          getApiErrorMessage(
            data,
            detail
          );
      } catch {
        /* ignore */
      }

      throw new ApiError(
        detail,
        res.status
      );
    }

    return res.json();
  },

  deleteDocument: (
    documentId: string
  ) =>
    request(
      `/documents/${documentId}`,
      {
        method: 'DELETE',
      }
    ),

  documentDownloadUrl: (
    documentId: string
  ) =>
    `/api/documents/${documentId}/download`,

  /* =========================================================
     MODÈLES DE GUIDES
     ========================================================= */

  /**
   * Récupère tous les modèles de guides.
   */
  listGuideTemplates: () =>
    request<
      import('./types').GuideTemplate[]
    >(
      '/guide-templates'
    ),

  /**
   * Upload d'un modèle de guide
   * associé à un nœud du questionnaire.
   */
  uploadGuideTemplate: async (
    nodeId: string,
    file: File
  ) => {
    const formData =
      new FormData();

    formData.append(
      'node_id',
      String(nodeId).trim()
    );

    formData.append(
      'file',
      file
    );

    const res = await fetch(
      '/api/guide-templates/upload',
      {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      }
    );

    if (!res.ok) {
      let detail =
        res.statusText;

      try {
        const data =
          await res.json();

        detail =
          getApiErrorMessage(
            data,
            detail
          );
      } catch {
        /* ignore */
      }

      throw new ApiError(
        detail,
        res.status
      );
    }

    return res.json();
  },

  /**
   * Supprime un modèle de guide.
   */
  deleteGuideTemplate: (
    templateId: string
  ) =>
    request(
      `/guide-templates/${String(
        templateId
      ).trim()}`,
      {
        method: 'DELETE',
      }
    ),

  /**
   * URL simple du téléchargement.
   *
   * Conservée pour les endroits de
   * l'application qui utilisent directement
   * l'URL.
   */
  guideTemplateDownloadUrl: (
    templateId: string
  ) =>
    `/api/guide-templates/${String(
      templateId
    ).trim()}/download`,

  /**
   * Téléchargement authentifié d'un modèle
   * de guide.
   *
   * Le JWT est envoyé dans Authorization.
   * La réponse est récupérée sous forme
   * de Blob afin que le navigateur force
   * le téléchargement du fichier.
   */
  downloadGuideTemplate: async (
    templateId: string
  ): Promise<Blob> => {
    const cleanId =
      String(templateId).trim();

    if (!cleanId) {
      throw new ApiError(
        'Identifiant du modèle introuvable.',
        400
      );
    }

    const url =
      `/api/guide-templates/${encodeURIComponent(
        cleanId
      )}/download`;

    const res = await fetch(
      url,
      {
        method: 'GET',
        credentials: 'same-origin',
      }
    );

    if (!res.ok) {
      let detail =
        `Erreur HTTP ${res.status}`;

      try {
        const contentType =
          res.headers.get(
            'content-type'
          ) || '';

        if (
          contentType.includes(
            'application/json'
          )
        ) {
          const data =
            await res.json();

          detail =
            getApiErrorMessage(
              data,
              detail
            );
        } else {
          const text =
            await res.text();

          if (text.trim()) {
            detail = text;
          }
        }
      } catch {
        /* ignore */
      }

      console.error(
        '[AFCsoft] Erreur téléchargement modèle :',
        {
          status: res.status,
          detail,
          templateId: cleanId,
        }
      );

      throw new ApiError(
        detail,
        res.status
      );
    }

    const blob =
      await res.blob();

    console.log(
      '[AFCsoft] Modèle téléchargé :',
      {
        templateId: cleanId,
        size: blob.size,
        type: blob.type,
      }
    );

    return blob;
  },
};

export { request };
