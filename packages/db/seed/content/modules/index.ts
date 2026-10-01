import type { ContentModule } from '../types';
import { comecePorVoce } from './01-comece-por-voce';
import { aArteDaConquista } from './02-a-arte-da-conquista';
import { conversasQueAproximam } from './03-conversas-que-aproximam';
import { romanceESurpresas } from './04-romance-e-surpresas';
import { confiancaSemParanoia } from './05-confianca-sem-paranoia';
import { quandoARelacaoBalanca } from './06-quando-a-relacao-balanca';
import { depoisDoTermino } from './07-depois-do-termino';
import { amorQueDura } from './08-amor-que-dura';

/** Os 8 módulos do curso, na ordem da jornada (cuidar de si → conquistar → manter → recomeçar). */
export const courseModules: ContentModule[] = [
  comecePorVoce,
  aArteDaConquista,
  conversasQueAproximam,
  romanceESurpresas,
  confiancaSemParanoia,
  quandoARelacaoBalanca,
  depoisDoTermino,
  amorQueDura,
];
