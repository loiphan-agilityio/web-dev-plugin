import { useParams } from 'react-router';

import { TaskDetail, TaskNotFound } from './task-detail';

/** `Number('abc')` is NaN: an id from the URL that cannot be a task id never reaches the API. */
const parseId = (raw: string | undefined) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export function TaskDetailPage() {
  const id = parseId(useParams().id);
  return id === null ? <TaskNotFound /> : <TaskDetail id={id} />;
}
