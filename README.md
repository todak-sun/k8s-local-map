# HOW TO

## Requirement

- 본 프로그램을 실행하기 위해서는 아래 환경이 사전 준비되어 있어야 합니다.
  - kubectl 및 사용하고자 하는 cluster에 대한 설정
  - node.js
  - pnpm
  - docker

## Settings

/assets/settings/default.setting.json 파일에 가서, 로컬로 매핑하고 싶은 서비스들을 나열해주세요.

```json
{
  "mappings": [
    {
      "context": "<your-cluster-name>",
      "deployment": "<your-deployment-name>",
      "namespace": "<your-namespace-name>"
    }
  ]
}
```

## Start

```sh
pnpm install
pnpm start
```
- 프로그램이 실행되면 Settings에 설정한 값을 토대로 `deployment.namespace` 의 규칙을 가진 로컬 Domain Name이 생깁니다.
- 따라서, `http://deployment.namespace` 로 요청한다면 쿠버네티스에 동일한 이름으로 배포된 서비스로 요청이 들어갑니다.

## How to Working
- 세팅 파일에 입력한 내용을 토대로, `kubectl`을 통해 클러스터에 배포된 `pod`의 이름과 `port` 정보를 얻습니다.
- 얻은 정보를 가지고 다음의 작업을 진행합니다.
  - `kubectl port-forward` 명령어로 로컬 PC에 대상 서비스 모두를 Random한 Port에 대해 Port Forwarding 합니다.
  - `<deployment>.<namespace>`을 Server Name으로 하는 Nginx Config 파일을 생성하고, 위에서 Random하게 결정된 포트들에 proxy pass를 설정합니다.
    - 생성된 Nginx Config 파일은 모두 80 Port를 Listen 합니다.
    - 생성된 Config를 Volume Mount한 Nginx Container가 실행됩니다.
- 따라서, `http://<deployment>.<namespace>`로 사용자가 요청을 하면, 도커 위에 구동되고 있는 Nginx에 의해 HOST PC에 포트포워딩 된 서비스로 요청이 가능해집니다.

## Warning

- MacOS에서만 테스트를 해본 관계로, 다른 OS에서는 정상 작동하지 않을 수 있습니다.
- grpc 프로토콜은 지원하지 않습니다.
