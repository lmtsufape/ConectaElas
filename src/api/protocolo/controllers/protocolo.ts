import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::protocolo.protocolo', ({ strapi }) => ({
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const { data } = ctx.request.body;

      if (!data || Object.keys(data).length === 0) {
        return ctx.badRequest('Nenhum dado foi fornecido para atualização.');
      }

      console.log(`Atualizando protocolo ID ${id}:`, data);

      const response = await strapi.service('api::protocolo.protocolo').update(id, { data });

      return ctx.send(response);
    } catch (error) {
      ctx.throw(500, 'Erro ao atualizar o protocolo', { error });
    }
  }
}));
