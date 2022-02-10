import is from '@sindresorhus/is';
import { logger } from '../../../logger';
import { ExternalHostError } from '../../../types/errors/external-host-error';
import { GithubHttp } from '../../../util/http/github';
import type { Preset, PresetConfig } from '../types';
import {
  PRESET_DEP_NOT_FOUND,
  PRESET_INVALID_JSON,
  fetchPreset,
} from '../util';

export const Endpoint = 'https://api.github.com/';

const http = new GithubHttp();

export async function fetchJSONFile(
  repo: string,
  fileName: string,
  endpoint: string,
  packageTag?: string | null
): Promise<Preset> {
  let ref = '';
  if (is.nonEmptyString(packageTag)) {
    ref = `?ref=${packageTag}`;
  }
  const url = `${endpoint}repos/${repo}/contents/${fileName}${ref}`;
  logger.trace({ url }, `Preset URL`);
  let res: { body: { content: string } };
  try {
    res = await http.getJson(url);
  } catch (err) {
    // istanbul ignore if: not testable with nock
    if (err instanceof ExternalHostError) {
      throw err;
    }
    logger.debug(
      { statusCode: err.statusCode, url },
      `Failed to retrieve ${fileName} from repo`
    );
    throw new Error(PRESET_DEP_NOT_FOUND);
  }
  try {
    const content = Buffer.from(res.body.content, 'base64').toString();
    const parsed = JSON.parse(content);
    return parsed;
  } catch (err) {
    throw new Error(PRESET_INVALID_JSON);
  }
}

export function getPresetFromEndpoint(
  pkgName: string,
  filePreset: string,
  presetPath?: string,
  endpoint: string | undefined = Endpoint,
  packageTag?: string
): Promise<Preset> {
  return fetchPreset({
    pkgName,
    filePreset,
    presetPath,
    endpoint,
    packageTag,
    fetch: fetchJSONFile,
  });
}

export function getPreset({
  packageName: pkgName,
  presetName = 'default',
  presetPath,
  packageTag,
}: PresetConfig): Promise<Preset> {
  return getPresetFromEndpoint(
    pkgName,
    presetName,
    presetPath,
    Endpoint,
    packageTag
  );
}
