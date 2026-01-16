import { TaskPreset } from '@/types';

export const TASK_PRESETS: TaskPreset[] = [
  {
    name: 'Reading',
    quota: 15,
    quotaType: 'DAILY',
    icon: 'BookOpen',
  },
  {
    name: 'Study',
    quota: 30,
    quotaType: 'DAILY',
    icon: 'GraduationCap',
  },
  {
    name: 'Workout',
    quota: 45,
    quotaType: 'DAILY',
    icon: 'Dumbbell',
  },
  {
    name: 'Meditation',
    quota: 10,
    quotaType: 'DAILY',
    icon: 'Leaf',
  },
  {
    name: 'Deep Work',
    quota: 120,
    quotaType: 'DAILY',
    icon: 'Focus',
  },
  {
    name: 'Language',
    quota: 20,
    quotaType: 'DAILY',
    icon: 'Languages',
  },
];
