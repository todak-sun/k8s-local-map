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
sudo pnpm start # /etc/hosts 파일을 조작하므로, 관리자 권한으로 실행해야 함
```

- 프로그램이 실행되면 Settings에 설정한 값을 토대로 ${deployment-name}.${namespace-name} 의 규칙을 가진 로컬 Domain Name이 생깁니다.
- 따라서, http://${deployment-name}.${namespace-name} 로 요청한다면 쿠버네티스에 동일한 이름으로 배포된 서비스로 요청이 들어갑니다.

## Warning

- 본 프로그램은 MacOS에서만 테스트를 해본 관계로, 다른 OS에서는 정상 작동하지 않을 수 있습니다.
- 본 프로그램은 `/etc/hosts` 파일을 조작합니다.
- 본 프로그램은 grpc 프로토콜은 지원하지 않습니다.
