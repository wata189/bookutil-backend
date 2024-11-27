# cloud run jobsのデプロイ時と更新時のコマンド

- デプロイ時

```
gcloud run jobs create bookutilhogehoge --image asia-docker.pkg.dev/bookutil/asia.gcr.io/bookutil/bookutilhogehoge:latest
```

- 更新時

```
gcloud run jobs update bookutilhogehoge
```
