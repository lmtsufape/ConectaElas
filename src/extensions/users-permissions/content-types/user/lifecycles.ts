import { validateCPF } from '../../../../utils/validateCPF'

export default {
  async beforeCreate(event)
  {
    const { data } = event.params;

    if (!data.username || !validateCPF(data.username)) {
      throw new Error('CPF inválido');
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;

    if (data.username && !validateCPF(data.username)) {
      throw new Error('CPF inválido');
    }
  },
};
