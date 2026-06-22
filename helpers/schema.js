const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');

// Monta o JSON-LD do tipo Vehicle (schema.org) a partir dos dados do anúncio.
// Retorna null quando não há anúncio, para o template simplesmente não renderizar.
function montarSchemaVehicle(anuncio, url) {
  if (!anuncio) return null;

  const nome = [anuncio.marca, anuncio.versao].filter(Boolean).join(' ').trim();
  const imagem = anuncio.imagem_principal
    ? (String(anuncio.imagem_principal).startsWith('http')
      ? anuncio.imagem_principal
      : `${SITE_URL}/uploads/anuncios/${anuncio.imagem_principal}`)
    : null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: nome || 'Veículo',
    url
  };

  if (anuncio.marca) schema.brand = { '@type': 'Brand', name: anuncio.marca };
  if (anuncio.versao) schema.model = anuncio.versao;
  if (anuncio.ano_modelo) schema.vehicleModelDate = String(anuncio.ano_modelo);
  if (anuncio.ano_fabricacao) schema.productionDate = String(anuncio.ano_fabricacao);
  if (anuncio.cor) schema.color = anuncio.cor;
  if (anuncio.carroceria) schema.bodyType = anuncio.carroceria;
  if (anuncio.portas) schema.numberOfDoors = Number(anuncio.portas);
  if (anuncio.combustivel) schema.fuelType = anuncio.combustivel;
  if (anuncio.cambio) schema.vehicleTransmission = anuncio.cambio;
  if (anuncio.motorizacao) {
    schema.vehicleEngine = { '@type': 'EngineSpecification', name: anuncio.motorizacao };
  }
  if (anuncio.km !== null && anuncio.km !== undefined && anuncio.km !== '') {
    schema.mileageFromOdometer = {
      '@type': 'QuantitativeValue',
      value: Number(anuncio.km),
      unitCode: 'KMT'
    };
  }
  if (anuncio.descricao) schema.description = String(anuncio.descricao).trim();
  if (imagem) schema.image = imagem;

  const condicao = String(anuncio.condicao || '').toLowerCase();
  const itemCondition = condicao.includes('novo') && !condicao.includes('semi')
    ? 'https://schema.org/NewCondition'
    : 'https://schema.org/UsedCondition';

  if (anuncio.preco !== null && anuncio.preco !== undefined && anuncio.preco !== '') {
    schema.offers = {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: Number(anuncio.preco),
      availability: 'https://schema.org/InStock',
      itemCondition,
      url
    };

    if (anuncio.cidade || anuncio.estado) {
      const address = { '@type': 'PostalAddress', addressCountry: 'BR' };
      if (anuncio.cidade) address.addressLocality = anuncio.cidade;
      if (anuncio.estado) address.addressRegion = anuncio.estado;
      schema.offers.areaServed = { '@type': 'Place', address };
    }

    // Venda de veículo é retirada presencial: declaramos explicitamente "sem frete"
    // e "sem devolução" para silenciar os avisos de merchant listing do Search Console
    // (shippingDetails / hasMerchantReturnPolicy faltando em "offers").
    schema.offers.shippingDetails = {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'BRL' },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BR' }
    };
    schema.offers.hasMerchantReturnPolicy = {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'BR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted'
    };
  }

  return schema;
}

module.exports = { montarSchemaVehicle };
