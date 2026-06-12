const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

const PASTAS = [
  'public/images',
  'public/icones',
  'public/imagens/img',
  'public/imagens/img/logomarca-de-fabricantes',
];

const IGNORAR = ['og-temcar.jpg', 'og-temcar.png', 'favicon-default.png'];

async function converterPasta(pasta) {
  const dir = path.resolve(__dirname, '..', pasta);
  let arquivos;
  try {
    arquivos = await fs.readdir(dir);
  } catch {
    return;
  }

  for (const arquivo of arquivos) {
    if (!/\.(jpg|jpeg|png)$/i.test(arquivo)) continue;
    if (IGNORAR.includes(arquivo)) continue;

    const origem = path.join(dir, arquivo);
    const destino = path.join(dir, arquivo.replace(/\.(jpg|jpeg|png)$/i, '.webp'));

    try {
      const stat = await fs.stat(destino).catch(() => null);
      if (stat) { console.log(`  já existe: ${arquivo}`); continue; }

      await sharp(origem).webp({ quality: 85 }).toFile(destino);
      console.log(`  ✓ ${arquivo} → ${path.basename(destino)}`);
    } catch (err) {
      console.error(`  ✗ ${arquivo}: ${err.message}`);
    }
  }
}

(async () => {
  for (const pasta of PASTAS) {
    console.log(`\n${pasta}`);
    await converterPasta(pasta);
  }
  console.log('\nConversão concluída.');
})();
