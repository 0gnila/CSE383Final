<?php
class RestServer {
  public $global_method;
  public $serviceClass;

  public function __construct($serviceClass, $method) {
    $this->serviceClass = $serviceClass;
    $this->global_method = $method;
  }

  public function handle() {
    $rArray = array_change_key_case($_REQUEST, CASE_LOWER);

    $method = $this->global_method;

    if (!$method) {
      return json_encode(['status' => 1, 'message' => 'No method was requested.']);
    }

    if (!method_exists($this->serviceClass, $method)) {
      return json_encode(['status' => 1, 'message' => "The method '$method' does not exist."]);
    }

    try {
      $ref = new ReflectionMethod($this->serviceClass, $method);
      $params = $ref->getParameters();

      $args = [];
      foreach ($params as $param) {
        $name = strtolower($param->getName());
        if (!isset($rArray[$name])) {
          return json_encode(['status' => 1, 'message' => "Missing parameter: $name"]);
        }
        $args[] = $rArray[$name];
      }

      $result = call_user_func_array([$this->serviceClass, $method], $args);
      return $result;

    } catch (Exception $e) {
      return json_encode(['status' => 1, 'message' => 'Error: ' . $e->getMessage()]);
    }
  }
}