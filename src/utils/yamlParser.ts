import yaml from 'js-yaml';

export function parseYaml(yamlString: string): any {
  try {
    return yaml.load(yamlString);
  } catch (error) {
    console.error('Error parsing YAML:', error);
    throw error;
  }
}
