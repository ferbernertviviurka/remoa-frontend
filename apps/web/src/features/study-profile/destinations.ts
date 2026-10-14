import type {ProfileCapabilities} from '@remoa/contracts';
/** F35 FR-26: the Enamed destination follows capabilities.showEnamed (rules live in profileCapabilities, not here). */
export const studyDestinationEnabled=(href:string,caps:Pick<ProfileCapabilities,'showEnamed'>)=>href!=='/app/cobertura'||caps.showEnamed;
export const STUDY_EDIT_HREF='/app/conta/perfil?campo=estudo';
