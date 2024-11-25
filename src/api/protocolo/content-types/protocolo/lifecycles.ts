'use strict';

function gerarProtocoloAtendimento() {
    const timestamp = Date.now()
    const random= Math.floor(1000 + Math.random() * 9000);
    return `${timestamp}${random}`;
}

export default {
  beforeCreate(event) {
    let random = gerarProtocoloAtendimento();
    event.params.data.ProtocoloID = random;
  }
};