'use server';

import { revalidatePath } from 'next/cache';
import { gqlClient } from '../graphql/client';
import {
  CREATE_PROJECT_MUTATION,
  UPDATE_PROJECT_MUTATION,
  CREATE_MATERIAL_MUTATION,
  UPDATE_MATERIAL_MUTATION,
} from '../graphql/queries';

// Server Actions run on the server — they call your NestJS backend directly,
// not through the browser. The JWT is injected by gqlClient() from the session.

export async function createProject(formData: FormData) {
  const client = await gqlClient();

  await client.request(CREATE_PROJECT_MUTATION, {
    input: {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      status: formData.get('status') as string,
    },
  });

  // Revalidate the projects list — Next.js will refetch the page data
  revalidatePath('/dashboard');
  revalidatePath('/projects');
}

export async function updateProjectStatus(projectId: string, status: string) {
  const client = await gqlClient();

  await client.request(UPDATE_PROJECT_MUTATION, {
    id: projectId,
    input: { status },
  });

  revalidatePath('/dashboard');
  revalidatePath(`/projects/${projectId}`);
}

export async function addMaterial(projectId: string, formData: FormData) {
  const client = await gqlClient();

  await client.request(CREATE_MATERIAL_MUTATION, {
    input: {
      projectId,
      name: formData.get('name') as string,
      quantity: parseFloat(formData.get('quantity') as string),
      unit: formData.get('unit') as string,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateMaterialStatus(materialId: string, status: string) {
  const client = await gqlClient();

  await client.request(UPDATE_MATERIAL_MUTATION, {
    id: materialId,
    input: { status },
  });
}
