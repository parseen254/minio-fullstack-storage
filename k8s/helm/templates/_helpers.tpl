{{/*
Expand the name of the chart.
*/}}
{{- define "minio-storage-system.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "minio-storage-system.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "minio-storage-system.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "minio-storage-system.labels" -}}
helm.sh/chart: {{ include "minio-storage-system.chart" . }}
{{ include "minio-storage-system.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "minio-storage-system.selectorLabels" -}}
app.kubernetes.io/name: {{ include "minio-storage-system.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "minio-storage-system.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "minio-storage-system.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "minio-storage-system.backend.labels" -}}
{{ include "minio-storage-system.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "minio-storage-system.frontend.labels" -}}
{{ include "minio-storage-system.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
NATS labels
*/}}
{{- define "minio-storage-system.nats.labels" -}}
{{ include "minio-storage-system.labels" . }}
app.kubernetes.io/component: nats
{{- end }}
