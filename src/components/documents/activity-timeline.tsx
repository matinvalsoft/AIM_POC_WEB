"use client";

import React from 'react';
import { Clock, Edit03, CheckCircle, AlertTriangle, Mail01, FileCheck02, File01 } from '@untitledui/icons';
import type { Activity } from '@/types/activity';

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
  error?: string;
}

const getActivityIcon = (activityType: Activity['activityType']) => {
  switch (activityType) {
    case 'created':
      return <File01 className="w-4 h-4" />;
    case 'status_changed':
      return <FileCheck02 className="w-4 h-4" />;
    case 'edited':
      return <Edit03 className="w-4 h-4" />;
    case 'coded':
      return <FileCheck02 className="w-4 h-4" />;
    case 'approved':
      return <CheckCircle className="w-4 h-4" />;
    case 'rejected':
      return <AlertTriangle className="w-4 h-4" />;
    case 'exported':
      return <Mail01 className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getActivityColor = (activityType: Activity['activityType']) => {
  switch (activityType) {
    case 'created':
      return 'text-blue-600 bg-blue-50';
    case 'status_changed':
      return 'text-cyan-600 bg-cyan-50';
    case 'edited':
      return 'text-teal-600 bg-teal-50';
    case 'coded':
      return 'text-green-600 bg-green-50';
    case 'approved':
      return 'text-emerald-600 bg-emerald-50';
    case 'rejected':
      return 'text-red-600 bg-red-50';
    case 'exported':
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`;
  } else if (diffInHours < 168) { // 7 days
    return `${Math.floor(diffInHours / 24)}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const parseJsonValue = (value?: string): any => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ 
  activities, 
  loading = false, 
  error 
}) => {
  if (loading) {
    return (
      <div className="space-y-3 w-full max-w-full">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse w-full max-w-full">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0"></div>
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg w-full max-w-full">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{error}</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Clock className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 font-medium mb-1">No Activity</p>
        <p className="text-xs text-gray-400">No activities recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full">
      {activities.map((activity, index) => {
        const isLast = index === activities.length - 1;
        const iconColorClass = getActivityColor(activity.activityType);
        const oldValue = parseJsonValue(activity.oldValue);
        const newValue = parseJsonValue(activity.newValue);

        return (
          <div key={activity.id} className="relative w-full max-w-full">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-4 top-8 bottom-0 w-px bg-gray-200"></div>
            )}
            
            <div className="flex items-start gap-3 w-full max-w-full">
              {/* Activity icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconColorClass}`}>
                {getActivityIcon(activity.activityType)}
              </div>

              {/* Activity content */}
              <div className="flex-1 min-w-0 w-full max-w-full overflow-hidden">
                <div className="flex items-center justify-between w-full max-w-full">
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {activity.description}
                    </span>
                    {activity.systemGenerated && (
                      <span className="px-1.5 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded flex-shrink-0">
                        System
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatRelativeTime(activity.performedAt)}
                  </span>
                </div>

                {/* Performed by */}
                <p className="text-xs text-gray-500 mt-1 truncate">
                  by {activity.performedBy}
                </p>

                {/* Field change details */}
                {activity.fieldChanged && (oldValue || newValue) && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs w-full max-w-full overflow-hidden">
                    <div className="font-medium text-gray-700 mb-1 truncate">
                      {activity.fieldChanged}
                    </div>
                    {oldValue && (
                      <div className="text-gray-500 break-words">
                        <span className="font-medium">From:</span> {
                          typeof oldValue === 'object' ? 
                          Object.values(oldValue)[0] : 
                          oldValue
                        }
                      </div>
                    )}
                    {newValue && (
                      <div className="text-gray-700 break-words">
                        <span className="font-medium">To:</span> {
                          typeof newValue === 'object' ? 
                          Object.values(newValue)[0] : 
                          newValue
                        }
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {activity.notes && (
                  <p className="text-xs text-gray-500 mt-1 italic break-words">
                    {activity.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
