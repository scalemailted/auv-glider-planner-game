import { assertBarotropicControl, createBarotropicControlField } from './current_vertical_structure_test_helpers.mjs';
const field = createBarotropicControlField();
assertBarotropicControl(field);
console.log('smoke_current_barotropic_control: ok', { digest: field.digest, depthDependent: field.sourceMetadata.depthDependent, structure: field.sourceMetadata.verticalStructureId });